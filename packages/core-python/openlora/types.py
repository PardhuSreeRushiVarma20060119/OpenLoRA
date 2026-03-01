"""
OpenLoRA Core Types — Python

Tier 0: Primary Intelligence Language
These types define the core data structures for LoRA training,
adapters, datasets, and experiments.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

# =============================================================================
# Enums
# =============================================================================

class AdapterStatus(StrEnum):
    """Status of a LoRA adapter."""
    ACTIVE = "active"
    TRAINING = "training"
    QUARANTINED = "quarantined"
    ARCHIVED = "archived"
    DESTROYED = "destroyed"


class AdapterTask(StrEnum):
    """Task type for LoRA adapter."""
    CAUSAL_LM = "CAUSAL_LM"
    SEQ_2_SEQ_LM = "SEQ_2_SEQ_LM"
    SEQ_CLS = "SEQ_CLS"
    TOKEN_CLS = "TOKEN_CLS"


class ExperimentStatus(StrEnum):
    """Status of an experiment run."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    KILLED = "killed"


# =============================================================================
# Core Types
# =============================================================================

@dataclass
class AdapterConfig:
    """Configuration for a LoRA adapter."""
    rank: int = 16
    alpha: float = 32.0
    dropout: float = 0.1
    target_modules: list[str] = field(default_factory=lambda: [
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ])
    bias: str = "none"


@dataclass
class AdapterMetadata:
    """Metadata for a LoRA adapter."""
    description: str | None = None
    tags: list[str] = field(default_factory=list)
    trained_on: str | None = None
    accuracy: float | None = None
    signature: str | None = None


@dataclass
class Adapter:
    """A LoRA adapter."""
    id: UUID
    name: str
    version: int
    base_model_id: UUID
    task: AdapterTask
    config: AdapterConfig
    status: AdapterStatus
    metadata: AdapterMetadata
    storage_path: str
    checksum: str
    owner_id: UUID
    created_at: datetime
    updated_at: datetime
    parent_adapter_id: UUID | None = None


@dataclass
class BaseModel:
    """A base model (frozen)."""
    id: UUID
    name: str
    architecture: str
    parameter_count: int
    storage_path: str
    checksum: str
    created_at: datetime


@dataclass
class DatasetVersion:
    """A versioned dataset."""
    id: UUID
    dataset_id: UUID
    version: int
    parent_version_id: UUID | None
    checksum: str
    row_count: int
    storage_path: str
    metadata: dict[str, Any]
    created_at: datetime


@dataclass
class ExperimentConfig:
    """Configuration for an experiment run."""
    adapter_config: AdapterConfig
    learning_rate: float = 2e-4
    batch_size: int = 8
    epochs: int = 3
    gradient_accumulation_steps: int = 4
    warmup_steps: int = 100
    seed: int = 42


@dataclass
class Metrics:
    """Training/evaluation metrics."""
    loss: float | None = None
    perplexity: float | None = None
    accuracy: float | None = None
    gradient_norm: float | None = None
    learning_rate: float | None = None
    step: int | None = None
    epoch: int | None = None
    custom: dict[str, float] = field(default_factory=dict)


@dataclass
class ExperimentRun:
    """An experiment run."""
    id: UUID
    adapter_id: UUID | None
    dataset_version_id: UUID
    config: ExperimentConfig
    status: ExperimentStatus
    metrics: Metrics
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
