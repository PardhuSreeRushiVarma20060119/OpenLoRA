"""
Skill Clusterer — Cluster adapters by skill/behavior.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class Cluster:
    """A cluster of similar adapters/skills."""

    id: int
    name: str
    members: list[str]
    centroid: list[float]
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ClusterResult:
    """Result of clustering analysis."""

    clusters: list[Cluster]
    labels: list[int]
    silhouette_score: float
    method: str


class SkillClusterer:
    """Cluster adapters by learned skills/behaviors."""

    def __init__(self, n_clusters: int = 5):
        self.n_clusters = n_clusters

    def cluster_adapters(
        self,
        adapter_embeddings: dict[str, np.ndarray],
    ) -> ClusterResult:
        """Cluster adapters by their weight embeddings.

        Args:
            adapter_embeddings: Dict mapping adapter name to embedding.

        Returns:
            ClusterResult with cluster assignments.
        """
        from sklearn.cluster import KMeans
        from sklearn.metrics import silhouette_score

        names = list(adapter_embeddings.keys())
        embeddings = np.array([adapter_embeddings[n] for n in names])

        # Ensure we don't have more clusters than samples
        n_clusters = min(self.n_clusters, len(names) - 1)
        if n_clusters < 2:
            return ClusterResult(
                clusters=[Cluster(0, "all", names, embeddings.mean(axis=0).tolist())],
                labels=[0] * len(names),
                silhouette_score=0.0,
                method="single",
            )

        kmeans = KMeans(n_clusters=n_clusters, random_state=42)
        labels = kmeans.fit_predict(embeddings)

        # Compute silhouette score
        sil_score = silhouette_score(embeddings, labels)

        # Build clusters
        clusters = []
        for i in range(n_clusters):
            mask = labels == i
            members = [names[j] for j, m in enumerate(mask) if m]
            centroid = kmeans.cluster_centers_[i].tolist()
            clusters.append(Cluster(
                id=i,
                name=f"Cluster_{i}",
                members=members,
                centroid=centroid,
            ))

        return ClusterResult(
            clusters=clusters,
            labels=labels.tolist(),
            silhouette_score=sil_score,
            method="kmeans",
        )

    def find_similar_adapters(
        self,
        query_embedding: np.ndarray,
        adapter_embeddings: dict[str, np.ndarray],
        top_k: int = 5,
    ) -> list[tuple[str, float]]:
        """Find adapters most similar to a query.

        Args:
            query_embedding: Query adapter embedding.
            adapter_embeddings: Dict of adapter embeddings.
            top_k: Number of results.

        Returns:
            List of (adapter_name, similarity) tuples.
        """
        from sklearn.metrics.pairwise import cosine_similarity

        names = list(adapter_embeddings.keys())
        embeddings = np.array([adapter_embeddings[n] for n in names])

        similarities = cosine_similarity([query_embedding], embeddings)[0]

        results = list(zip(names, similarities))
        results.sort(key=lambda x: x[1], reverse=True)

        return results[:top_k]
