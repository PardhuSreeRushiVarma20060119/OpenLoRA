"""
Token and Adapter Attribution — Explainability through attribution.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import torch
import torch.nn.functional as F
from transformers import PreTrainedModel, PreTrainedTokenizer

logger = logging.getLogger(__name__)


@dataclass
class AttributionResult:
    """Result of attribution analysis."""

    tokens: list[str]
    scores: list[float]
    normalized_scores: list[float]
    method: str
    metadata: dict[str, Any] = field(default_factory=dict)


class TokenAttributor:
    """Compute token-level attribution for model outputs.

    Supports multiple attribution methods:
    - gradient: Gradient-based attribution
    - integrated_gradients: Integrated gradients
    - attention: Attention-based attribution
    """

    def __init__(
        self,
        model: PreTrainedModel,
        tokenizer: PreTrainedTokenizer,
    ):
        self.model = model
        self.tokenizer = tokenizer
        self.device = next(model.parameters()).device

    def attribute_gradient(
        self,
        text: str,
        target_token_idx: int = -1,
    ) -> AttributionResult:
        """Compute gradient-based attribution.

        Args:
            text: Input text.
            target_token_idx: Index of target token (-1 for last).

        Returns:
            Attribution scores for each input token.
        """
        self.model.eval()

        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            return_offsets_mapping=True,
        ).to(self.device)

        embeddings = self.model.get_input_embeddings()
        input_embeds = embeddings(inputs.input_ids)
        input_embeds.requires_grad_(True)

        # Forward pass
        outputs = self.model(
            inputs_embeds=input_embeds,
            attention_mask=inputs.attention_mask,
        )

        logits = outputs.logits
        target_logit = logits[0, target_token_idx, :].max()

        # Backward pass
        target_logit.backward()

        # Gradient attribution
        grads = input_embeds.grad[0]  # [seq_len, hidden_dim]
        attribution = (grads * input_embeds[0].detach()).sum(dim=-1)
        attribution = attribution.abs().cpu().numpy()

        tokens = self.tokenizer.convert_ids_to_tokens(inputs.input_ids[0])
        scores = attribution.tolist()
        normalized = self._normalize(scores)

        return AttributionResult(
            tokens=tokens,
            scores=scores,
            normalized_scores=normalized,
            method="gradient",
        )

    def attribute_attention(
        self,
        text: str,
        layer: int = -1,
        head: int | None = None,
    ) -> AttributionResult:
        """Compute attention-based attribution.

        Args:
            text: Input text.
            layer: Which layer's attention (-1 for last).
            head: Specific head (None for mean across heads).

        Returns:
            Attribution scores based on attention weights.
        """
        self.model.eval()

        inputs = self.tokenizer(text, return_tensors="pt").to(self.device)

        with torch.no_grad():
            outputs = self.model(
                **inputs,
                output_attentions=True,
            )

        # Get attention from specified layer
        attention = outputs.attentions[layer]  # [batch, heads, seq, seq]

        if head is not None:
            attention = attention[:, head, :, :]
        else:
            attention = attention.mean(dim=1)  # Mean across heads

        # Attribution is attention to last token
        attribution = attention[0, -1, :].cpu().numpy()

        tokens = self.tokenizer.convert_ids_to_tokens(inputs.input_ids[0])
        scores = attribution.tolist()
        normalized = self._normalize(scores)

        return AttributionResult(
            tokens=tokens,
            scores=scores,
            normalized_scores=normalized,
            method="attention",
            metadata={"layer": layer, "head": head},
        )

    def _normalize(self, scores: list[float]) -> list[float]:
        """Normalize scores to [0, 1]."""
        min_s = min(scores)
        max_s = max(scores)
        if max_s - min_s < 1e-8:
            return [0.5] * len(scores)
        return [(s - min_s) / (max_s - min_s) for s in scores]


class AdapterAttributor:
    """Compute adapter-level attribution.

    Analyze which LoRA adapters contribute most to output.
    """

    def __init__(
        self,
        model: PreTrainedModel,
        tokenizer: PreTrainedTokenizer,
    ):
        self.model = model
        self.tokenizer = tokenizer
        self.device = next(model.parameters()).device

    def compute_adapter_contribution(
        self,
        text: str,
        adapter_names: list[str] | None = None,
    ) -> dict[str, float]:
        """Compute contribution of each adapter to output.

        Uses activation patching: compare output with/without each adapter.

        Args:
            text: Input text.
            adapter_names: List of adapter names to analyze.

        Returns:
            Dictionary mapping adapter name to contribution score.
        """
        from peft import PeftModel

        if not isinstance(self.model, PeftModel):
            logger.warning("Model is not a PeftModel, cannot compute adapter contribution")
            return {}

        inputs = self.tokenizer(text, return_tensors="pt").to(self.device)

        # Get baseline output (with all adapters)
        with torch.no_grad():
            baseline = self.model(**inputs).logits

        if adapter_names is None:
            adapter_names = list(self.model.peft_config.keys())

        contributions = {}

        for adapter_name in adapter_names:
            # Disable this adapter
            self.model.disable_adapter_layers()
            for name in adapter_names:
                if name != adapter_name:
                    self.model.enable_adapter_layers()

            with torch.no_grad():
                without = self.model(**inputs).logits

            # Contribution is difference in output
            diff = (baseline - without).abs().mean().item()
            contributions[adapter_name] = diff

            # Re-enable all
            self.model.enable_adapter_layers()

        # Normalize contributions
        total = sum(contributions.values()) + 1e-8
        contributions = {k: v / total for k, v in contributions.items()}

        return contributions

    def compare_base_vs_adapted(
        self,
        text: str,
    ) -> dict[str, Any]:
        """Compare output distribution between base and adapted model.

        Args:
            text: Input text.

        Returns:
            Comparison metrics.
        """
        from peft import PeftModel

        if not isinstance(self.model, PeftModel):
            return {}

        inputs = self.tokenizer(text, return_tensors="pt").to(self.device)

        # Adapted output
        with torch.no_grad():
            adapted_logits = self.model(**inputs).logits

        # Base output (disable adapters)
        self.model.disable_adapter_layers()
        with torch.no_grad():
            base_logits = self.model.base_model(**inputs).logits
        self.model.enable_adapter_layers()

        # Compute metrics
        adapted_probs = F.softmax(adapted_logits[0, -1], dim=-1)
        base_probs = F.softmax(base_logits[0, -1], dim=-1)

        # KL divergence
        kl_div = F.kl_div(
            adapted_probs.log(),
            base_probs,
            reduction="sum",
        ).item()

        # Top token changes
        adapted_top = adapted_probs.topk(5)
        base_top = base_probs.topk(5)

        adapted_tokens = self.tokenizer.convert_ids_to_tokens(adapted_top.indices.tolist())
        base_tokens = self.tokenizer.convert_ids_to_tokens(base_top.indices.tolist())

        return {
            "kl_divergence": kl_div,
            "adapted_top_tokens": list(zip(adapted_tokens, adapted_top.values.tolist())),
            "base_top_tokens": list(zip(base_tokens, base_top.values.tolist())),
        }
