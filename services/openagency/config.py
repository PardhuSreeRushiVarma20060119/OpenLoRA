"""
RL Configuration for OpenAgency.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


@dataclass
class RLConfig:
    """Reinforcement learning configuration."""

    # Algorithm
    algorithm: Literal["ppo", "grpo", "dpo"] = "ppo"

    # PPO hyperparameters
    learning_rate: float = 1e-5
    kl_coef: float = 0.1
    kl_target: float = 6.0
    clip_range: float = 0.2
    value_clip_range: float = 0.2
    gamma: float = 0.99
    gae_lambda: float = 0.95

    # Training
    num_epochs: int = 4
    batch_size: int = 4
    mini_batch_size: int = 1
    gradient_accumulation_steps: int = 4
    max_grad_norm: float = 1.0

    # Rollout
    rollout_batch_size: int = 16
    max_new_tokens: int = 256
    temperature: float = 0.7
    top_p: float = 0.9

    # Reward
    reward_baseline: Literal["mean", "none"] = "mean"
    reward_clip: float = 10.0
    whiten_rewards: bool = True

    # Safety
    max_kl_divergence: float = 0.3
    early_stop_kl: bool = True

    # Memory
    bf16: bool = True
    gradient_checkpointing: bool = True

    # Seed
    seed: int = 42


@dataclass
class RewardConfig:
    """Reward shaping configuration."""

    # Weights for different reward components
    task_weight: float = 1.0
    safety_weight: float = 0.5
    stability_weight: float = 0.1

    # Safety thresholds
    toxicity_threshold: float = 0.5
    toxicity_penalty: float = -5.0

    # Stability
    gradient_norm_threshold: float = 10.0
    gradient_penalty: float = -1.0
