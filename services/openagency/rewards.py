"""
Reward Shaping — Multi-objective reward framework for RL-LoRA.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Callable

import torch


@dataclass
class RewardSignal:
    """A single reward signal with metadata."""

    value: float
    name: str
    weight: float = 1.0
    metadata: dict[str, Any] = field(default_factory=dict)


class RewardComponent(ABC):
    """Base class for reward components."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Reward component name."""
        pass

    @abstractmethod
    def compute(
        self,
        prompt: str,
        response: str,
        **context: Any,
    ) -> RewardSignal:
        """Compute reward signal for a response."""
        pass


class TaskReward(RewardComponent):
    """Task-specific reward (e.g., quality, accuracy)."""

    def __init__(
        self,
        scorer: Callable[[str, str], float],
        weight: float = 1.0,
    ):
        self.scorer = scorer
        self.weight = weight

    @property
    def name(self) -> str:
        return "task"

    def compute(
        self,
        prompt: str,
        response: str,
        **context: Any,
    ) -> RewardSignal:
        score = self.scorer(prompt, response)
        return RewardSignal(
            value=score,
            name=self.name,
            weight=self.weight,
        )


class SafetyReward(RewardComponent):
    """Safety reward (penalize toxic/harmful outputs)."""

    def __init__(
        self,
        toxicity_threshold: float = 0.5,
        penalty: float = -5.0,
        weight: float = 0.5,
    ):
        self.toxicity_threshold = toxicity_threshold
        self.penalty = penalty
        self.weight = weight
        self._classifier = None

    @property
    def name(self) -> str:
        return "safety"

    def _load_classifier(self) -> None:
        """Lazy load toxicity classifier."""
        if self._classifier is None:
            from transformers import pipeline
            self._classifier = pipeline(
                "text-classification",
                model="unitary/toxic-bert",
                device="cuda" if torch.cuda.is_available() else "cpu",
            )

    def compute(
        self,
        prompt: str,
        response: str,
        **context: Any,
    ) -> RewardSignal:
        self._load_classifier()

        result = self._classifier(response[:512])[0]
        toxicity_score = result["score"] if result["label"] == "toxic" else 0.0

        if toxicity_score > self.toxicity_threshold:
            reward = self.penalty
        else:
            reward = 1.0 - toxicity_score

        return RewardSignal(
            value=reward,
            name=self.name,
            weight=self.weight,
            metadata={"toxicity_score": toxicity_score},
        )


class StabilityReward(RewardComponent):
    """Stability reward (penalize high gradient norms)."""

    def __init__(
        self,
        threshold: float = 10.0,
        penalty: float = -1.0,
        weight: float = 0.1,
    ):
        self.threshold = threshold
        self.penalty = penalty
        self.weight = weight

    @property
    def name(self) -> str:
        return "stability"

    def compute(
        self,
        prompt: str,
        response: str,
        grad_norm: float | None = None,
        **context: Any,
    ) -> RewardSignal:
        if grad_norm is None:
            return RewardSignal(value=0.0, name=self.name, weight=self.weight)

        if grad_norm > self.threshold:
            reward = self.penalty * (grad_norm / self.threshold)
        else:
            reward = 0.0

        return RewardSignal(
            value=reward,
            name=self.name,
            weight=self.weight,
            metadata={"grad_norm": grad_norm},
        )


class RewardShaper:
    """Combine multiple reward signals into a single reward."""

    def __init__(self, components: list[RewardComponent] | None = None):
        self.components = components or []

    def add_component(self, component: RewardComponent) -> None:
        """Add a reward component."""
        self.components.append(component)

    def compute(
        self,
        prompt: str,
        response: str,
        **context: Any,
    ) -> tuple[float, list[RewardSignal]]:
        """Compute combined reward.

        Returns:
            Tuple of (total_reward, individual_signals).
        """
        signals = []
        total = 0.0

        for component in self.components:
            signal = component.compute(prompt, response, **context)
            signals.append(signal)
            total += signal.value * signal.weight

        return total, signals

    def compute_batch(
        self,
        prompts: list[str],
        responses: list[str],
        **context: Any,
    ) -> tuple[list[float], list[list[RewardSignal]]]:
        """Compute rewards for a batch."""
        rewards = []
        all_signals = []

        for prompt, response in zip(prompts, responses):
            reward, signals = self.compute(prompt, response, **context)
            rewards.append(reward)
            all_signals.append(signals)

        return rewards, all_signals
