"""
RL-LoRA Trainer — PPO/GRPO training for LoRA adapters.

INVARIANT: Only LoRA parameters are updated. Base model frozen.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

import torch
from torch.optim import AdamW
from tqdm import tqdm

from openagency.config import RLConfig
from openagency.policy import AdapterPolicy
from openagency.rewards import RewardShaper

logger = logging.getLogger(__name__)


@dataclass
class RLTrainingResult:
    """Result of RL training run."""

    run_id: UUID
    total_steps: int
    mean_reward: float
    mean_kl: float
    training_time_seconds: float


class RLLoRATrainer:
    """RL trainer for LoRA adapters using PPO.

    Hard Rule: Base model weights are FROZEN. Only LoRA updated.
    """

    def __init__(
        self,
        policy: AdapterPolicy,
        reward_shaper: RewardShaper,
        config: RLConfig | None = None,
    ):
        self.policy = policy
        self.reward_shaper = reward_shaper
        self.config = config or RLConfig()

        # Reference policy for KL computation
        self._ref_policy: AdapterPolicy | None = None

        self._optimizer: AdamW | None = None
        self._setup_optimizer()

    def _setup_optimizer(self) -> None:
        """Setup optimizer for LoRA parameters only."""
        trainable_params = self.policy.get_trainable_params()

        if not trainable_params:
            raise RuntimeError("No trainable parameters found. Is LoRA applied?")

        self._optimizer = AdamW(
            trainable_params,
            lr=self.config.learning_rate,
        )

        trainable_count = sum(p.numel() for p in trainable_params)
        logger.info(f"Optimizer configured for {trainable_count:,} LoRA parameters")

    def set_reference_policy(self, ref_policy: AdapterPolicy) -> None:
        """Set reference policy for KL divergence computation."""
        self._ref_policy = ref_policy
        logger.info("Reference policy set for KL computation")

    def train(
        self,
        prompts: list[str],
        num_steps: int = 1000,
    ) -> RLTrainingResult:
        """Run PPO training loop.

        Args:
            prompts: Training prompts.
            num_steps: Number of training steps.

        Returns:
            Training result with metrics.
        """
        run_id = uuid4()
        start_time = datetime.now()
        logger.info(f"Starting RL training run: {run_id}")

        all_rewards = []
        all_kls = []

        pbar = tqdm(range(num_steps), desc="RL Training")
        for step in pbar:
            # Sample batch of prompts
            batch_indices = torch.randint(0, len(prompts), (self.config.rollout_batch_size,))
            batch_prompts = [prompts[i] for i in batch_indices]

            # Collect rollouts
            rollout_data = self._collect_rollouts(batch_prompts)

            # Compute rewards
            rewards = self._compute_rewards(batch_prompts, rollout_data["responses"])

            # PPO update
            stats = self._ppo_step(rollout_data, rewards)

            all_rewards.extend(rewards)
            all_kls.append(stats["kl"])

            pbar.set_postfix({
                "reward": f"{stats['mean_reward']:.3f}",
                "kl": f"{stats['kl']:.3f}",
            })

            # Early stop on KL
            if self.config.early_stop_kl and stats["kl"] > self.config.max_kl_divergence:
                logger.warning(f"Early stopping: KL {stats['kl']:.3f} > {self.config.max_kl_divergence}")
                break

        training_time = (datetime.now() - start_time).total_seconds()

        result = RLTrainingResult(
            run_id=run_id,
            total_steps=step + 1,
            mean_reward=sum(all_rewards) / len(all_rewards) if all_rewards else 0.0,
            mean_kl=sum(all_kls) / len(all_kls) if all_kls else 0.0,
            training_time_seconds=training_time,
        )

        logger.info(
            f"RL training complete — Reward: {result.mean_reward:.3f}, "
            f"KL: {result.mean_kl:.3f}, Time: {training_time:.1f}s"
        )

        return result

    def _collect_rollouts(self, prompts: list[str]) -> dict[str, Any]:
        """Collect rollouts from current policy."""
        responses, log_probs = self.policy.generate(
            prompts,
            max_new_tokens=self.config.max_new_tokens,
            temperature=self.config.temperature,
            top_p=self.config.top_p,
        )

        return {
            "prompts": prompts,
            "responses": responses,
            "log_probs": log_probs,
        }

    def _compute_rewards(
        self,
        prompts: list[str],
        responses: list[str],
    ) -> list[float]:
        """Compute rewards for responses."""
        rewards, _ = self.reward_shaper.compute_batch(prompts, responses)

        # Clip rewards
        rewards = [max(-self.config.reward_clip, min(self.config.reward_clip, r)) for r in rewards]

        # Whiten rewards
        if self.config.whiten_rewards and len(rewards) > 1:
            mean_r = sum(rewards) / len(rewards)
            std_r = (sum((r - mean_r) ** 2 for r in rewards) / len(rewards)) ** 0.5 + 1e-8
            rewards = [(r - mean_r) / std_r for r in rewards]

        return rewards

    def _ppo_step(
        self,
        rollout_data: dict[str, Any],
        rewards: list[float],
    ) -> dict[str, float]:
        """Perform PPO optimization step."""
        old_log_probs = rollout_data["log_probs"].detach()
        reward_tensor = torch.tensor(rewards, device=old_log_probs.device)

        total_loss = 0.0
        kl_sum = 0.0

        for _ in range(self.config.num_epochs):
            # Get current log probs
            inputs = self.policy.tokenizer(
                [p + r for p, r in zip(rollout_data["prompts"], rollout_data["responses"])],
                return_tensors="pt",
                padding=True,
                truncation=True,
            ).to(self.policy.device)

            outputs = self.policy.forward(
                inputs.input_ids,
                inputs.attention_mask,
                labels=inputs.input_ids,
            )

            new_log_probs = outputs.log_probs

            # Compute ratio and advantages
            ratio = torch.exp(new_log_probs - old_log_probs)
            advantages = reward_tensor

            # PPO clipping
            clipped_ratio = torch.clamp(
                ratio,
                1 - self.config.clip_range,
                1 + self.config.clip_range,
            )

            policy_loss = -torch.min(ratio * advantages, clipped_ratio * advantages).mean()

            # KL penalty
            kl = (old_log_probs - new_log_probs).mean()
            kl_loss = self.config.kl_coef * kl

            # Total loss
            loss = policy_loss + kl_loss

            # Optimize
            self._optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(
                self.policy.get_trainable_params(),
                self.config.max_grad_norm,
            )
            self._optimizer.step()

            total_loss += loss.item()
            kl_sum += kl.item()

        return {
            "mean_reward": reward_tensor.mean().item(),
            "loss": total_loss / self.config.num_epochs,
            "kl": kl_sum / self.config.num_epochs,
        }
