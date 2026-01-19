"""
Adapter Metadata — Metadata management for adapters.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal
from uuid import UUID


AdapterStatus = Literal["active", "training", "quarantined", "archived", "destroyed"]
AdapterTask = Literal["CAUSAL_LM", "SEQ_2_SEQ_LM", "SEQ_CLS", "TOKEN_CLS"]


@dataclass
class AdapterConfig:
    """LoRA configuration snapshot."""

    rank: int
    alpha: float
    dropout: float
    target_modules: list[str]
    bias: str


@dataclass
class AdapterMetadata:
    """Full metadata for a LoRA adapter."""

    id: UUID
    name: str
    version: int
    base_model: str
    task: AdapterTask
    config: AdapterConfig
    status: AdapterStatus
    storage_path: str
    checksum: str
    owner_id: str
    created_at: datetime
    updated_at: datetime
    parent_adapter_id: UUID | None = None
    description: str = ""
    tags: list[str] = field(default_factory=list)
    metrics: dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Serialize to dictionary."""
        return {
            "id": str(self.id),
            "name": self.name,
            "version": self.version,
            "base_model": self.base_model,
            "task": self.task,
            "config": {
                "rank": self.config.rank,
                "alpha": self.config.alpha,
                "dropout": self.config.dropout,
                "target_modules": self.config.target_modules,
                "bias": self.config.bias,
            },
            "status": self.status,
            "storage_path": self.storage_path,
            "checksum": self.checksum,
            "owner_id": self.owner_id,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "parent_adapter_id": str(self.parent_adapter_id) if self.parent_adapter_id else None,
            "description": self.description,
            "tags": self.tags,
            "metrics": self.metrics,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> AdapterMetadata:
        """Deserialize from dictionary."""
        config = AdapterConfig(
            rank=data["config"]["rank"],
            alpha=data["config"]["alpha"],
            dropout=data["config"]["dropout"],
            target_modules=data["config"]["target_modules"],
            bias=data["config"]["bias"],
        )
        return cls(
            id=UUID(data["id"]),
            name=data["name"],
            version=data["version"],
            base_model=data["base_model"],
            task=data["task"],
            config=config,
            status=data["status"],
            storage_path=data["storage_path"],
            checksum=data["checksum"],
            owner_id=data["owner_id"],
            created_at=datetime.fromisoformat(data["created_at"]),
            updated_at=datetime.fromisoformat(data["updated_at"]),
            parent_adapter_id=UUID(data["parent_adapter_id"]) if data.get("parent_adapter_id") else None,
            description=data.get("description", ""),
            tags=data.get("tags", []),
            metrics=data.get("metrics", {}),
        )
