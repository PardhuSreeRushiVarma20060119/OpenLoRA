"""
Adapter Policy — Policy network for RL-LoRA.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import torch
import torch.nn.functional as F
from transformers import PreTrainedModel, PreTrainedTokenizer

logger = logging.getLogger(__name__)


@dataclass
class PolicyOutput:
    """Output from policy forward pass."""

    logits: torch.Tensor
    log_probs: torch.Tensor
    entropy: torch.Tensor
    values: torch.Tensor | None = None


class AdapterPolicy:
    """Policy wrapper for LoRA-adapted model.

    Wraps a PEFT model and provides policy-style interface
    for RL training.
    """

    def __init__(
        self,
        model: PreTrainedModel,
        tokenizer: PreTrainedTokenizer,
        value_head: torch.nn.Module | None = None,
    ):
        self.model = model
        self.tokenizer = tokenizer
        self.value_head = value_head
        self.device = next(model.parameters()).device

    def forward(
        self,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor,
        labels: torch.Tensor | None = None,
    ) -> PolicyOutput:
        """Forward pass through policy.

        Args:
            input_ids: Input token IDs.
            attention_mask: Attention mask.
            labels: Optional labels for log probability computation.

        Returns:
            PolicyOutput with logits, log probs, entropy, and values.
        """
        outputs = self.model(
            input_ids=input_ids,
            attention_mask=attention_mask,
            output_hidden_states=self.value_head is not None,
        )

        logits = outputs.logits

        # Compute log probabilities
        if labels is not None:
            log_probs = self._compute_log_probs(logits, labels)
        else:
            log_probs = torch.zeros(input_ids.size(0), device=self.device)

        # Compute entropy
        entropy = self._compute_entropy(logits, attention_mask)

        # Compute values if value head present
        values = None
        if self.value_head is not None:
            hidden = outputs.hidden_states[-1]
            values = self.value_head(hidden).squeeze(-1)

        return PolicyOutput(
            logits=logits,
            log_probs=log_probs,
            entropy=entropy,
            values=values,
        )

    def _compute_log_probs(
        self,
        logits: torch.Tensor,
        labels: torch.Tensor,
    ) -> torch.Tensor:
        """Compute log probabilities for given labels."""
        # Shift for causal LM
        shift_logits = logits[:, :-1, :].contiguous()
        shift_labels = labels[:, 1:].contiguous()

        log_probs = F.log_softmax(shift_logits, dim=-1)
        token_log_probs = torch.gather(
            log_probs,
            dim=-1,
            index=shift_labels.unsqueeze(-1),
        ).squeeze(-1)

        # Mask padding
        mask = shift_labels != self.tokenizer.pad_token_id
        token_log_probs = token_log_probs * mask

        # Sum over sequence
        return token_log_probs.sum(dim=-1)

    def _compute_entropy(
        self,
        logits: torch.Tensor,
        attention_mask: torch.Tensor,
    ) -> torch.Tensor:
        """Compute entropy of policy."""
        probs = F.softmax(logits, dim=-1)
        log_probs = F.log_softmax(logits, dim=-1)
        entropy = -(probs * log_probs).sum(dim=-1)

        # Mask and average
        entropy = entropy * attention_mask
        return entropy.sum(dim=-1) / attention_mask.sum(dim=-1)

    def generate(
        self,
        prompts: list[str],
        max_new_tokens: int = 256,
        temperature: float = 0.7,
        top_p: float = 0.9,
        do_sample: bool = True,
    ) -> tuple[list[str], torch.Tensor]:
        """Generate responses from prompts.

        Args:
            prompts: Input prompts.
            max_new_tokens: Maximum tokens to generate.
            temperature: Sampling temperature.
            top_p: Nucleus sampling threshold.
            do_sample: Whether to sample or greedy decode.

        Returns:
            Tuple of (generated_texts, log_probs).
        """
        inputs = self.tokenizer(
            prompts,
            return_tensors="pt",
            padding=True,
            truncation=True,
        ).to(self.device)

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                top_p=top_p,
                do_sample=do_sample,
                pad_token_id=self.tokenizer.pad_token_id,
                return_dict_in_generate=True,
                output_scores=True,
            )

        generated_ids = outputs.sequences
        generated_texts = self.tokenizer.batch_decode(
            generated_ids[:, inputs.input_ids.size(1):],
            skip_special_tokens=True,
        )

        # Compute log probs of generated tokens
        log_probs = self._compute_generation_log_probs(
            outputs.scores,
            generated_ids[:, inputs.input_ids.size(1):],
        )

        return generated_texts, log_probs

    def _compute_generation_log_probs(
        self,
        scores: tuple[torch.Tensor, ...],
        generated_ids: torch.Tensor,
    ) -> torch.Tensor:
        """Compute log probabilities for generated tokens."""
        log_probs = []
        for i, score in enumerate(scores):
            if i >= generated_ids.size(1):
                break
            token_log_probs = F.log_softmax(score, dim=-1)
            selected = torch.gather(
                token_log_probs,
                dim=-1,
                index=generated_ids[:, i].unsqueeze(-1),
            ).squeeze(-1)
            log_probs.append(selected)

        return torch.stack(log_probs, dim=1).sum(dim=1)

    def get_trainable_params(self) -> list[torch.nn.Parameter]:
        """Get trainable parameters (LoRA only)."""
        return [p for p in self.model.parameters() if p.requires_grad]
