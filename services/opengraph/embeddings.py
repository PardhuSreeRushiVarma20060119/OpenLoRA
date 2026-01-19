"""
Embedding Mapper — Visualize adapter/skill embeddings in 2D/3D.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Literal

import numpy as np
import torch
from transformers import PreTrainedModel

logger = logging.getLogger(__name__)


@dataclass
class EmbeddingPoint:
    """A point in embedding space."""

    id: str
    name: str
    x: float
    y: float
    z: float | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class EmbeddingMap:
    """A 2D/3D embedding map."""

    points: list[EmbeddingPoint]
    method: str
    dimensions: int
    metadata: dict[str, Any] = field(default_factory=dict)


class EmbeddingMapper:
    """Map high-dimensional embeddings to 2D/3D for visualization."""

    def __init__(self, method: Literal["tsne", "umap", "pca"] = "umap"):
        self.method = method
        self._reducer = None

    def _get_reducer(self, n_components: int = 2):
        """Get or create dimensionality reducer."""
        if self._reducer is not None:
            return self._reducer

        if self.method == "umap":
            try:
                from umap import UMAP
                self._reducer = UMAP(n_components=n_components, random_state=42)
            except ImportError:
                logger.warning("UMAP not available, falling back to PCA")
                from sklearn.decomposition import PCA
                self._reducer = PCA(n_components=n_components)
        elif self.method == "tsne":
            from sklearn.manifold import TSNE
            self._reducer = TSNE(n_components=n_components, random_state=42)
        else:
            from sklearn.decomposition import PCA
            self._reducer = PCA(n_components=n_components)

        return self._reducer

    def map_adapters(
        self,
        adapters: list[tuple[str, PreTrainedModel]],
        n_components: int = 2,
    ) -> EmbeddingMap:
        """Map LoRA adapter parameters to embedding space.

        Args:
            adapters: List of (name, model) tuples.
            n_components: 2 or 3 dimensions.

        Returns:
            EmbeddingMap with adapter positions.
        """
        embeddings = []

        for name, model in adapters:
            # Extract LoRA weights as embedding
            lora_weights = []
            for param_name, param in model.named_parameters():
                if "lora" in param_name.lower() and param.requires_grad:
                    lora_weights.append(param.data.flatten())

            if lora_weights:
                adapter_embedding = torch.cat(lora_weights).cpu().numpy()
                embeddings.append(adapter_embedding)
            else:
                logger.warning(f"No LoRA weights found for {name}")

        if not embeddings:
            return EmbeddingMap(points=[], method=self.method, dimensions=n_components)

        # Pad to same length
        max_len = max(len(e) for e in embeddings)
        padded = np.array([np.pad(e, (0, max_len - len(e))) for e in embeddings])

        # Reduce dimensionality
        reducer = self._get_reducer(n_components)
        reduced = reducer.fit_transform(padded)

        # Create points
        points = []
        for i, (name, _) in enumerate(adapters):
            point = EmbeddingPoint(
                id=f"adapter_{i}",
                name=name,
                x=float(reduced[i, 0]),
                y=float(reduced[i, 1]),
                z=float(reduced[i, 2]) if n_components == 3 else None,
            )
            points.append(point)

        return EmbeddingMap(
            points=points,
            method=self.method,
            dimensions=n_components,
        )

    def map_outputs(
        self,
        texts: list[str],
        embeddings: np.ndarray,
        n_components: int = 2,
    ) -> EmbeddingMap:
        """Map output embeddings to 2D/3D.

        Args:
            texts: Text labels for each embedding.
            embeddings: Matrix of shape [n_samples, embedding_dim].
            n_components: 2 or 3 dimensions.

        Returns:
            EmbeddingMap with positions.
        """
        reducer = self._get_reducer(n_components)
        reduced = reducer.fit_transform(embeddings)

        points = []
        for i, text in enumerate(texts):
            point = EmbeddingPoint(
                id=f"output_{i}",
                name=text[:50],
                x=float(reduced[i, 0]),
                y=float(reduced[i, 1]),
                z=float(reduced[i, 2]) if n_components == 3 else None,
                metadata={"full_text": text},
            )
            points.append(point)

        return EmbeddingMap(
            points=points,
            method=self.method,
            dimensions=n_components,
        )
