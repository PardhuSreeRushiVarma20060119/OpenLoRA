"""
Dataset Versioning — Track dataset versions and lineage.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from datasets import Dataset


@dataclass
class DatasetVersionInfo:
    """Information about a dataset version."""

    id: UUID
    dataset_id: UUID
    version: int
    checksum: str
    row_count: int
    columns: list[str]
    created_at: datetime
    parent_version_id: UUID | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "id": str(self.id),
            "dataset_id": str(self.dataset_id),
            "version": self.version,
            "checksum": self.checksum,
            "row_count": self.row_count,
            "columns": self.columns,
            "created_at": self.created_at.isoformat(),
            "parent_version_id": str(self.parent_version_id) if self.parent_version_id else None,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> DatasetVersionInfo:
        """Create from dictionary."""
        return cls(
            id=UUID(data["id"]),
            dataset_id=UUID(data["dataset_id"]),
            version=data["version"],
            checksum=data["checksum"],
            row_count=data["row_count"],
            columns=data["columns"],
            created_at=datetime.fromisoformat(data["created_at"]),
            parent_version_id=UUID(data["parent_version_id"]) if data.get("parent_version_id") else None,
            metadata=data.get("metadata", {}),
        )


class DatasetVersionManager:
    """Manage dataset versions and lineage."""

    def __init__(self, storage_dir: str | Path):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self._versions: dict[UUID, list[DatasetVersionInfo]] = {}
        self._load_index()

    def _load_index(self) -> None:
        """Load version index from disk."""
        index_path = self.storage_dir / "index.json"
        if index_path.exists():
            with open(index_path, "r") as f:
                data = json.load(f)
                for dataset_id, versions in data.items():
                    self._versions[UUID(dataset_id)] = [
                        DatasetVersionInfo.from_dict(v) for v in versions
                    ]

    def _save_index(self) -> None:
        """Save version index to disk."""
        index_path = self.storage_dir / "index.json"
        data = {
            str(k): [v.to_dict() for v in vs]
            for k, vs in self._versions.items()
        }
        with open(index_path, "w") as f:
            json.dump(data, f, indent=2)

    def compute_checksum(self, dataset: Dataset) -> str:
        """Compute checksum for dataset."""
        hasher = hashlib.sha256()
        for example in dataset:
            hasher.update(str(example).encode())
        return hasher.hexdigest()[:16]

    def create_version(
        self,
        dataset: Dataset,
        dataset_id: UUID | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> DatasetVersionInfo:
        """Create a new version of a dataset.

        Args:
            dataset: Dataset to version.
            dataset_id: Existing dataset ID (None for new dataset).
            metadata: Optional metadata to attach.

        Returns:
            Version info for the created version.
        """
        is_new = dataset_id is None
        dataset_id = dataset_id or uuid4()

        existing = self._versions.get(dataset_id, [])
        version_num = len(existing) + 1
        parent_id = existing[-1].id if existing else None

        checksum = self.compute_checksum(dataset)

        version_info = DatasetVersionInfo(
            id=uuid4(),
            dataset_id=dataset_id,
            version=version_num,
            checksum=checksum,
            row_count=len(dataset),
            columns=dataset.column_names,
            created_at=datetime.now(),
            parent_version_id=parent_id,
            metadata=metadata or {},
        )

        # Save dataset
        version_dir = self.storage_dir / str(dataset_id) / f"v{version_num}"
        version_dir.mkdir(parents=True, exist_ok=True)
        dataset.save_to_disk(str(version_dir / "data"))

        # Save version info
        with open(version_dir / "version.json", "w") as f:
            json.dump(version_info.to_dict(), f, indent=2)

        # Update index
        if dataset_id not in self._versions:
            self._versions[dataset_id] = []
        self._versions[dataset_id].append(version_info)
        self._save_index()

        return version_info

    def get_version(
        self,
        dataset_id: UUID,
        version: int | None = None,
    ) -> Dataset | None:
        """Load a specific version of a dataset.

        Args:
            dataset_id: Dataset identifier.
            version: Version number (None for latest).

        Returns:
            Dataset or None if not found.
        """
        versions = self._versions.get(dataset_id)
        if not versions:
            return None

        if version is None:
            version = len(versions)

        if version < 1 or version > len(versions):
            return None

        version_dir = self.storage_dir / str(dataset_id) / f"v{version}"
        data_path = version_dir / "data"

        if not data_path.exists():
            return None

        return Dataset.load_from_disk(str(data_path))

    def list_versions(self, dataset_id: UUID) -> list[DatasetVersionInfo]:
        """List all versions of a dataset."""
        return self._versions.get(dataset_id, [])

    def get_lineage(self, version_id: UUID) -> list[DatasetVersionInfo]:
        """Get lineage chain for a version."""
        # Find the version
        for versions in self._versions.values():
            for v in versions:
                if v.id == version_id:
                    lineage = [v]
                    current = v
                    while current.parent_version_id:
                        parent = self._find_version(current.parent_version_id)
                        if parent:
                            lineage.append(parent)
                            current = parent
                        else:
                            break
                    return list(reversed(lineage))
        return []

    def _find_version(self, version_id: UUID) -> DatasetVersionInfo | None:
        """Find a version by ID."""
        for versions in self._versions.values():
            for v in versions:
                if v.id == version_id:
                    return v
        return None
