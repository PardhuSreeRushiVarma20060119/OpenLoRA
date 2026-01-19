"""
Behavior Graph — Graph-based representation of adapter interactions.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class GraphNode:
    """A node in the behavior graph."""

    id: str
    type: str  # adapter, skill, behavior, output
    label: str
    properties: dict[str, Any] = field(default_factory=dict)


@dataclass
class GraphEdge:
    """An edge in the behavior graph."""

    source: str
    target: str
    type: str  # influences, produces, conflicts_with
    weight: float = 1.0
    properties: dict[str, Any] = field(default_factory=dict)


@dataclass
class BehaviorGraphData:
    """Complete behavior graph data."""

    nodes: list[GraphNode]
    edges: list[GraphEdge]
    metadata: dict[str, Any] = field(default_factory=dict)


class BehaviorGraph:
    """Build and analyze behavior interaction graphs."""

    def __init__(self):
        self._nodes: dict[str, GraphNode] = {}
        self._edges: list[GraphEdge] = []

    def add_adapter(
        self,
        adapter_id: str,
        name: str,
        skills: list[str] | None = None,
        **properties: Any,
    ) -> None:
        """Add an adapter node."""
        node = GraphNode(
            id=adapter_id,
            type="adapter",
            label=name,
            properties={"skills": skills or [], **properties},
        )
        self._nodes[adapter_id] = node

        # Add skill nodes and edges
        for skill in (skills or []):
            skill_id = f"skill_{skill}"
            if skill_id not in self._nodes:
                self._nodes[skill_id] = GraphNode(
                    id=skill_id,
                    type="skill",
                    label=skill,
                )
            self._edges.append(GraphEdge(
                source=adapter_id,
                target=skill_id,
                type="has_skill",
            ))

    def add_interaction(
        self,
        source_id: str,
        target_id: str,
        interaction_type: str,
        weight: float = 1.0,
        **properties: Any,
    ) -> None:
        """Add an interaction edge between nodes."""
        self._edges.append(GraphEdge(
            source=source_id,
            target=target_id,
            type=interaction_type,
            weight=weight,
            properties=properties,
        ))

    def detect_conflicts(self) -> list[tuple[str, str, float]]:
        """Detect conflicting adapters based on skills.

        Returns:
            List of (adapter1, adapter2, conflict_score) tuples.
        """
        conflicts = []

        adapters = [n for n in self._nodes.values() if n.type == "adapter"]

        for i, a1 in enumerate(adapters):
            for a2 in adapters[i + 1:]:
                skills1 = set(a1.properties.get("skills", []))
                skills2 = set(a2.properties.get("skills", []))

                overlap = skills1 & skills2
                if overlap:
                    conflict_score = len(overlap) / max(len(skills1), len(skills2), 1)
                    conflicts.append((a1.id, a2.id, conflict_score))

        return sorted(conflicts, key=lambda x: x[2], reverse=True)

    def get_influence_path(
        self,
        source_id: str,
        target_id: str,
    ) -> list[str] | None:
        """Find influence path between two nodes using BFS.

        Args:
            source_id: Starting node.
            target_id: Target node.

        Returns:
            List of node IDs in path, or None if no path.
        """
        from collections import deque

        if source_id not in self._nodes or target_id not in self._nodes:
            return None

        # Build adjacency list
        adj: dict[str, list[str]] = {n: [] for n in self._nodes}
        for edge in self._edges:
            adj[edge.source].append(edge.target)

        # BFS
        queue = deque([(source_id, [source_id])])
        visited = {source_id}

        while queue:
            current, path = queue.popleft()

            if current == target_id:
                return path

            for neighbor in adj[current]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, path + [neighbor]))

        return None

    def to_data(self) -> BehaviorGraphData:
        """Export graph data."""
        return BehaviorGraphData(
            nodes=list(self._nodes.values()),
            edges=self._edges,
        )

    def to_json(self) -> str:
        """Export as JSON for visualization."""
        data = {
            "nodes": [
                {"id": n.id, "type": n.type, "label": n.label, **n.properties}
                for n in self._nodes.values()
            ],
            "edges": [
                {"source": e.source, "target": e.target, "type": e.type, "weight": e.weight}
                for e in self._edges
            ],
        }
        return json.dumps(data, indent=2)
