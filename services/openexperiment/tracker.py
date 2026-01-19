"""
Experiment Tracker — Track training runs and metrics.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

logger = logging.getLogger(__name__)


@dataclass
class Metrics:
    """Training metrics for a step."""

    step: int
    loss: float | None = None
    learning_rate: float | None = None
    grad_norm: float | None = None
    epoch: float | None = None
    custom: dict[str, float] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> dict[str, Any]:
        return {
            "step": self.step,
            "loss": self.loss,
            "learning_rate": self.learning_rate,
            "grad_norm": self.grad_norm,
            "epoch": self.epoch,
            "custom": self.custom,
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass
class Run:
    """A training run."""

    id: UUID
    name: str
    config: dict[str, Any]
    status: str  # pending, running, completed, failed
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    metrics_history: list[Metrics] = field(default_factory=list)
    final_metrics: dict[str, float] = field(default_factory=dict)
    tags: list[str] = field(default_factory=list)
    notes: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": str(self.id),
            "name": self.name,
            "config": self.config,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "metrics_history": [m.to_dict() for m in self.metrics_history],
            "final_metrics": self.final_metrics,
            "tags": self.tags,
            "notes": self.notes,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Run:
        return cls(
            id=UUID(data["id"]),
            name=data["name"],
            config=data["config"],
            status=data["status"],
            created_at=datetime.fromisoformat(data["created_at"]),
            started_at=datetime.fromisoformat(data["started_at"]) if data.get("started_at") else None,
            completed_at=datetime.fromisoformat(data["completed_at"]) if data.get("completed_at") else None,
            final_metrics=data.get("final_metrics", {}),
            tags=data.get("tags", []),
            notes=data.get("notes", ""),
        )


class ExperimentTracker:
    """Track and manage training experiments."""

    def __init__(self, storage_dir: str | Path):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self._runs: dict[UUID, Run] = {}
        self._active_run: Run | None = None
        self._load_runs()

    def _load_runs(self) -> None:
        """Load existing runs from disk."""
        runs_dir = self.storage_dir / "runs"
        if runs_dir.exists():
            for run_file in runs_dir.glob("*.json"):
                with open(run_file, "r") as f:
                    data = json.load(f)
                    run = Run.from_dict(data)
                    self._runs[run.id] = run

    def _save_run(self, run: Run) -> None:
        """Save run to disk."""
        runs_dir = self.storage_dir / "runs"
        runs_dir.mkdir(exist_ok=True)
        with open(runs_dir / f"{run.id}.json", "w") as f:
            json.dump(run.to_dict(), f, indent=2)

    def create_run(
        self,
        name: str,
        config: dict[str, Any],
        tags: list[str] | None = None,
    ) -> Run:
        """Create a new experiment run."""
        run = Run(
            id=uuid4(),
            name=name,
            config=config,
            status="pending",
            created_at=datetime.now(),
            tags=tags or [],
        )
        self._runs[run.id] = run
        self._save_run(run)
        logger.info(f"Created run: {run.id} ({name})")
        return run

    def start_run(self, run_id: UUID) -> Run:
        """Start a run."""
        run = self._runs.get(run_id)
        if not run:
            raise ValueError(f"Run not found: {run_id}")

        run.status = "running"
        run.started_at = datetime.now()
        self._active_run = run
        self._save_run(run)
        logger.info(f"Started run: {run_id}")
        return run

    def log_metrics(
        self,
        step: int,
        loss: float | None = None,
        learning_rate: float | None = None,
        grad_norm: float | None = None,
        epoch: float | None = None,
        **custom: float,
    ) -> None:
        """Log metrics for current step."""
        if not self._active_run:
            raise RuntimeError("No active run. Call start_run() first.")

        metrics = Metrics(
            step=step,
            loss=loss,
            learning_rate=learning_rate,
            grad_norm=grad_norm,
            epoch=epoch,
            custom=custom,
        )
        self._active_run.metrics_history.append(metrics)

    def complete_run(
        self,
        final_metrics: dict[str, float] | None = None,
        notes: str = "",
    ) -> Run:
        """Mark run as completed."""
        if not self._active_run:
            raise RuntimeError("No active run.")

        self._active_run.status = "completed"
        self._active_run.completed_at = datetime.now()
        self._active_run.final_metrics = final_metrics or {}
        self._active_run.notes = notes
        self._save_run(self._active_run)

        run = self._active_run
        self._active_run = None
        logger.info(f"Completed run: {run.id}")
        return run

    def fail_run(self, error: str) -> Run:
        """Mark run as failed."""
        if not self._active_run:
            raise RuntimeError("No active run.")

        self._active_run.status = "failed"
        self._active_run.completed_at = datetime.now()
        self._active_run.notes = f"Error: {error}"
        self._save_run(self._active_run)

        run = self._active_run
        self._active_run = None
        logger.error(f"Failed run: {run.id} — {error}")
        return run

    def get_run(self, run_id: UUID) -> Run | None:
        """Get a run by ID."""
        return self._runs.get(run_id)

    def list_runs(
        self,
        status: str | None = None,
        tags: list[str] | None = None,
    ) -> list[Run]:
        """List runs with optional filters."""
        runs = list(self._runs.values())

        if status:
            runs = [r for r in runs if r.status == status]

        if tags:
            runs = [r for r in runs if any(t in r.tags for t in tags)]

        return sorted(runs, key=lambda r: r.created_at, reverse=True)
