"""
Artifact Storage — Store training artifacts.
"""

from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path
from typing import Any
from uuid import UUID


class ArtifactStorage:
    """Store and retrieve training artifacts."""

    def __init__(self, storage_dir: str | Path):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def save_artifact(
        self,
        run_id: UUID,
        name: str,
        source_path: str | Path,
    ) -> str:
        """Save an artifact from a source path.

        Args:
            run_id: Run identifier.
            name: Artifact name.
            source_path: Path to the artifact.

        Returns:
            Path where artifact was saved.
        """
        source = Path(source_path)
        dest_dir = self.storage_dir / str(run_id) / "artifacts"
        dest_dir.mkdir(parents=True, exist_ok=True)

        if source.is_dir():
            dest = dest_dir / name
            if dest.exists():
                shutil.rmtree(dest)
            shutil.copytree(source, dest)
        else:
            dest = dest_dir / name
            shutil.copy2(source, dest)

        return str(dest)

    def save_json_artifact(
        self,
        run_id: UUID,
        name: str,
        data: Any,
    ) -> str:
        """Save JSON data as artifact.

        Args:
            run_id: Run identifier.
            name: Artifact name (will have .json extension).
            data: JSON-serializable data.

        Returns:
            Path where artifact was saved.
        """
        dest_dir = self.storage_dir / str(run_id) / "artifacts"
        dest_dir.mkdir(parents=True, exist_ok=True)

        filename = name if name.endswith(".json") else f"{name}.json"
        dest = dest_dir / filename

        with open(dest, "w") as f:
            json.dump(data, f, indent=2)

        return str(dest)

    def get_artifact_path(
        self,
        run_id: UUID,
        name: str,
    ) -> Path | None:
        """Get path to an artifact.

        Args:
            run_id: Run identifier.
            name: Artifact name.

        Returns:
            Path to artifact or None if not found.
        """
        artifact_path = self.storage_dir / str(run_id) / "artifacts" / name
        return artifact_path if artifact_path.exists() else None

    def list_artifacts(self, run_id: UUID) -> list[str]:
        """List all artifacts for a run.

        Args:
            run_id: Run identifier.

        Returns:
            List of artifact names.
        """
        artifacts_dir = self.storage_dir / str(run_id) / "artifacts"
        if not artifacts_dir.exists():
            return []
        return [p.name for p in artifacts_dir.iterdir()]

    def compute_checksum(self, path: str | Path) -> str:
        """Compute SHA256 checksum of file or directory.

        Args:
            path: Path to file or directory.

        Returns:
            Hex-encoded checksum.
        """
        path = Path(path)
        hasher = hashlib.sha256()

        if path.is_file():
            with open(path, "rb") as f:
                for chunk in iter(lambda: f.read(8192), b""):
                    hasher.update(chunk)
        elif path.is_dir():
            for file in sorted(path.rglob("*")):
                if file.is_file():
                    hasher.update(str(file.relative_to(path)).encode())
                    with open(file, "rb") as f:
                        for chunk in iter(lambda: f.read(8192), b""):
                            hasher.update(chunk)

        return hasher.hexdigest()[:16]
