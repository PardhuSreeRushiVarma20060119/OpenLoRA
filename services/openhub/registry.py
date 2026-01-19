"""
Adapter Registry — Local storage and retrieval of LoRA adapters.
"""

from __future__ import annotations

import hashlib
import json
import logging
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from peft import PeftModel, PeftConfig
from transformers import AutoModelForCausalLM, AutoTokenizer

from openhub.metadata import AdapterMetadata, AdapterConfig, AdapterStatus

logger = logging.getLogger(__name__)


class AdapterRegistry:
    """Local registry for LoRA adapters."""

    def __init__(self, storage_dir: str | Path):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self._adapters: dict[UUID, AdapterMetadata] = {}
        self._load_index()

    def _load_index(self) -> None:
        """Load adapter index from disk."""
        index_path = self.storage_dir / "index.json"
        if index_path.exists():
            with open(index_path, "r") as f:
                data = json.load(f)
                for adapter_data in data.get("adapters", []):
                    adapter = AdapterMetadata.from_dict(adapter_data)
                    self._adapters[adapter.id] = adapter

    def _save_index(self) -> None:
        """Save adapter index to disk."""
        index_path = self.storage_dir / "index.json"
        data = {
            "adapters": [a.to_dict() for a in self._adapters.values()],
            "updated_at": datetime.now().isoformat(),
        }
        with open(index_path, "w") as f:
            json.dump(data, f, indent=2)

    def _compute_checksum(self, path: Path) -> str:
        """Compute checksum for adapter directory."""
        hasher = hashlib.sha256()
        for file in sorted(path.rglob("*")):
            if file.is_file():
                hasher.update(str(file.relative_to(path)).encode())
                with open(file, "rb") as f:
                    for chunk in iter(lambda: f.read(8192), b""):
                        hasher.update(chunk)
        return hasher.hexdigest()[:16]

    def register(
        self,
        name: str,
        adapter_path: str | Path,
        base_model: str,
        config: AdapterConfig,
        owner_id: str = "default",
        description: str = "",
        tags: list[str] | None = None,
        metrics: dict[str, float] | None = None,
    ) -> AdapterMetadata:
        """Register a new adapter in the registry.

        Args:
            name: Adapter name.
            adapter_path: Path to adapter files.
            base_model: Base model name.
            config: LoRA configuration.
            owner_id: Owner identifier.
            description: Optional description.
            tags: Optional tags.
            metrics: Optional training metrics.

        Returns:
            Registered adapter metadata.
        """
        adapter_path = Path(adapter_path)
        adapter_id = uuid4()

        # Determine version
        existing_versions = [
            a.version for a in self._adapters.values() if a.name == name
        ]
        version = max(existing_versions, default=0) + 1

        # Copy to registry storage
        dest_path = self.storage_dir / str(adapter_id)
        if adapter_path != dest_path:
            shutil.copytree(adapter_path, dest_path)

        checksum = self._compute_checksum(dest_path)

        metadata = AdapterMetadata(
            id=adapter_id,
            name=name,
            version=version,
            base_model=base_model,
            task="CAUSAL_LM",  # Default
            config=config,
            status="active",
            storage_path=str(dest_path),
            checksum=checksum,
            owner_id=owner_id,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            description=description,
            tags=tags or [],
            metrics=metrics or {},
        )

        self._adapters[adapter_id] = metadata
        self._save_index()

        # Save metadata alongside adapter
        with open(dest_path / "metadata.json", "w") as f:
            json.dump(metadata.to_dict(), f, indent=2)

        logger.info(f"Registered adapter: {name} v{version} ({adapter_id})")
        return metadata

    def get(self, adapter_id: UUID) -> AdapterMetadata | None:
        """Get adapter metadata by ID."""
        return self._adapters.get(adapter_id)

    def get_by_name(
        self,
        name: str,
        version: int | None = None,
    ) -> AdapterMetadata | None:
        """Get adapter by name and optional version.

        Args:
            name: Adapter name.
            version: Specific version (None for latest).

        Returns:
            Adapter metadata or None.
        """
        matching = [a for a in self._adapters.values() if a.name == name]
        if not matching:
            return None

        if version:
            for adapter in matching:
                if adapter.version == version:
                    return adapter
            return None

        return max(matching, key=lambda a: a.version)

    def list(
        self,
        status: AdapterStatus | None = None,
        tags: list[str] | None = None,
        base_model: str | None = None,
    ) -> list[AdapterMetadata]:
        """List adapters with optional filters."""
        adapters = list(self._adapters.values())

        if status:
            adapters = [a for a in adapters if a.status == status]
        if tags:
            adapters = [a for a in adapters if any(t in a.tags for t in tags)]
        if base_model:
            adapters = [a for a in adapters if a.base_model == base_model]

        return sorted(adapters, key=lambda a: (a.name, -a.version))

    def load_adapter(
        self,
        adapter_id: UUID,
        base_model: Any | None = None,
    ) -> PeftModel:
        """Load adapter as PeftModel.

        Args:
            adapter_id: Adapter identifier.
            base_model: Optional pre-loaded base model.

        Returns:
            Loaded PeftModel.
        """
        metadata = self.get(adapter_id)
        if not metadata:
            raise ValueError(f"Adapter not found: {adapter_id}")

        if base_model is None:
            base_model = AutoModelForCausalLM.from_pretrained(
                metadata.base_model,
                device_map="auto",
                trust_remote_code=True,
            )

        return PeftModel.from_pretrained(
            base_model,
            metadata.storage_path,
        )

    def update_status(
        self,
        adapter_id: UUID,
        status: AdapterStatus,
    ) -> AdapterMetadata | None:
        """Update adapter status."""
        adapter = self._adapters.get(adapter_id)
        if not adapter:
            return None

        adapter.status = status
        adapter.updated_at = datetime.now()
        self._save_index()

        logger.info(f"Updated adapter {adapter_id} status to: {status}")
        return adapter

    def delete(self, adapter_id: UUID, hard: bool = False) -> bool:
        """Delete adapter.

        Args:
            adapter_id: Adapter identifier.
            hard: If True, remove files. If False, mark as archived.

        Returns:
            True if deleted, False if not found.
        """
        adapter = self._adapters.get(adapter_id)
        if not adapter:
            return False

        if hard:
            storage_path = Path(adapter.storage_path)
            if storage_path.exists():
                shutil.rmtree(storage_path)
            del self._adapters[adapter_id]
            logger.info(f"Hard deleted adapter: {adapter_id}")
        else:
            adapter.status = "archived"
            adapter.updated_at = datetime.now()
            logger.info(f"Archived adapter: {adapter_id}")

        self._save_index()
        return True
