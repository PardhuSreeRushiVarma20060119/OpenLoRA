"""
Attention Analyzer — Visualize and analyze attention patterns.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import torch
from transformers import PreTrainedModel, PreTrainedTokenizer

logger = logging.getLogger(__name__)


@dataclass
class AttentionPattern:
    """Attention pattern for a layer/head."""

    layer: int
    head: int | None  # None for averaged
    tokens: list[str]
    attention_matrix: list[list[float]]
    entropy: float
    sparsity: float


class AttentionAnalyzer:
    """Analyze attention patterns in transformer models."""

    def __init__(
        self,
        model: PreTrainedModel,
        tokenizer: PreTrainedTokenizer,
    ):
        self.model = model
        self.tokenizer = tokenizer
        self.device = next(model.parameters()).device

    def get_attention(
        self,
        text: str,
        layer: int = -1,
        head: int | None = None,
    ) -> AttentionPattern:
        """Get attention pattern for specific layer/head.

        Args:
            text: Input text.
            layer: Layer index (-1 for last).
            head: Head index (None for mean).

        Returns:
            AttentionPattern with matrix and metrics.
        """
        self.model.eval()

        inputs = self.tokenizer(text, return_tensors="pt").to(self.device)

        with torch.no_grad():
            outputs = self.model(
                **inputs,
                output_attentions=True,
            )

        attention = outputs.attentions[layer]  # [batch, heads, seq, seq]

        if head is not None:
            attn_matrix = attention[0, head].cpu().numpy()
        else:
            attn_matrix = attention[0].mean(dim=0).cpu().numpy()

        tokens = self.tokenizer.convert_ids_to_tokens(inputs.input_ids[0])
        entropy = self._compute_entropy(attn_matrix)
        sparsity = self._compute_sparsity(attn_matrix)

        return AttentionPattern(
            layer=layer if layer >= 0 else len(outputs.attentions) + layer,
            head=head,
            tokens=tokens,
            attention_matrix=attn_matrix.tolist(),
            entropy=entropy,
            sparsity=sparsity,
        )

    def get_all_layers(
        self,
        text: str,
        head: int | None = None,
    ) -> list[AttentionPattern]:
        """Get attention patterns for all layers.

        Args:
            text: Input text.
            head: Specific head (None for mean).

        Returns:
            List of AttentionPatterns for each layer.
        """
        self.model.eval()

        inputs = self.tokenizer(text, return_tensors="pt").to(self.device)

        with torch.no_grad():
            outputs = self.model(
                **inputs,
                output_attentions=True,
            )

        tokens = self.tokenizer.convert_ids_to_tokens(inputs.input_ids[0])
        patterns = []

        for i, attention in enumerate(outputs.attentions):
            if head is not None:
                attn_matrix = attention[0, head].cpu().numpy()
            else:
                attn_matrix = attention[0].mean(dim=0).cpu().numpy()

            patterns.append(AttentionPattern(
                layer=i,
                head=head,
                tokens=tokens,
                attention_matrix=attn_matrix.tolist(),
                entropy=self._compute_entropy(attn_matrix),
                sparsity=self._compute_sparsity(attn_matrix),
            ))

        return patterns

    def find_attention_heads(
        self,
        text: str,
        pattern: str = "positional",
    ) -> list[tuple[int, int, float]]:
        """Find attention heads matching a pattern.

        Args:
            text: Input text.
            pattern: Type of pattern to find:
                - "positional": Heads that attend to specific positions
                - "sparse": Heads with sparse attention
                - "uniform": Heads with uniform attention

        Returns:
            List of (layer, head, score) tuples.
        """
        self.model.eval()

        inputs = self.tokenizer(text, return_tensors="pt").to(self.device)

        with torch.no_grad():
            outputs = self.model(
                **inputs,
                output_attentions=True,
            )

        results = []

        for layer_idx, attention in enumerate(outputs.attentions):
            num_heads = attention.size(1)
            for head_idx in range(num_heads):
                attn = attention[0, head_idx].cpu().numpy()

                if pattern == "positional":
                    # Score by how much attention is on diagonal
                    score = self._diagonal_score(attn)
                elif pattern == "sparse":
                    score = self._compute_sparsity(attn)
                elif pattern == "uniform":
                    score = 1.0 - self._compute_entropy(attn) / 5.0  # Normalize
                else:
                    score = 0.0

                results.append((layer_idx, head_idx, score))

        # Sort by score descending
        return sorted(results, key=lambda x: x[2], reverse=True)

    def _compute_entropy(self, attn_matrix) -> float:
        """Compute average entropy of attention distribution."""
        import numpy as np
        attn = np.array(attn_matrix) + 1e-10
        entropy = -np.sum(attn * np.log(attn), axis=-1)
        return float(entropy.mean())

    def _compute_sparsity(self, attn_matrix, threshold: float = 0.1) -> float:
        """Compute sparsity (fraction of attention < threshold)."""
        import numpy as np
        attn = np.array(attn_matrix)
        return float((attn < threshold).mean())

    def _diagonal_score(self, attn_matrix) -> float:
        """Score how much attention is on diagonal (local attention)."""
        import numpy as np
        attn = np.array(attn_matrix)
        n = min(attn.shape)
        diagonal_sum = sum(attn[i, i] for i in range(n))
        return diagonal_sum / n
