"""
Dataset Loader — Multi-format ingestion for OpenLoRA.

Supports: HuggingFace Hub, JSONL, Parquet, CSV.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterator, Literal

from datasets import Dataset, load_dataset, IterableDataset


DatasetFormat = Literal["huggingface", "jsonl", "parquet", "csv", "auto"]


class DatasetLoader:
    """Load datasets from various sources."""

    def __init__(self, cache_dir: str | Path | None = None):
        self.cache_dir = Path(cache_dir) if cache_dir else None

    def load(
        self,
        source: str,
        format: DatasetFormat = "auto",
        split: str | None = None,
        streaming: bool = False,
        **kwargs: Any,
    ) -> Dataset | IterableDataset:
        """Load dataset from source.

        Args:
            source: HuggingFace dataset name or file path.
            format: Format hint ("auto" detects from source).
            split: Dataset split to load.
            streaming: Use streaming mode for large datasets.
            **kwargs: Additional arguments passed to loader.

        Returns:
            Loaded dataset.
        """
        if format == "auto":
            format = self._detect_format(source)

        if format == "huggingface":
            return self._load_huggingface(source, split, streaming, **kwargs)
        elif format == "jsonl":
            return self._load_jsonl(source, **kwargs)
        elif format == "parquet":
            return self._load_parquet(source, **kwargs)
        elif format == "csv":
            return self._load_csv(source, **kwargs)
        else:
            raise ValueError(f"Unknown format: {format}")

    def _detect_format(self, source: str) -> DatasetFormat:
        """Detect format from source path/name."""
        if "/" in source and not Path(source).exists():
            return "huggingface"

        path = Path(source)
        suffix = path.suffix.lower()

        if suffix == ".jsonl" or suffix == ".json":
            return "jsonl"
        elif suffix == ".parquet":
            return "parquet"
        elif suffix == ".csv":
            return "csv"
        else:
            return "huggingface"

    def _load_huggingface(
        self,
        name: str,
        split: str | None,
        streaming: bool,
        **kwargs: Any,
    ) -> Dataset | IterableDataset:
        """Load from HuggingFace Hub."""
        return load_dataset(
            name,
            split=split,
            streaming=streaming,
            cache_dir=str(self.cache_dir) if self.cache_dir else None,
            **kwargs,
        )

    def _load_jsonl(self, path: str, **kwargs: Any) -> Dataset:
        """Load from JSONL file."""
        return load_dataset("json", data_files=path, **kwargs)["train"]

    def _load_parquet(self, path: str, **kwargs: Any) -> Dataset:
        """Load from Parquet file."""
        return load_dataset("parquet", data_files=path, **kwargs)["train"]

    def _load_csv(self, path: str, **kwargs: Any) -> Dataset:
        """Load from CSV file."""
        return load_dataset("csv", data_files=path, **kwargs)["train"]

    def iter_jsonl(self, path: str | Path) -> Iterator[dict[str, Any]]:
        """Stream JSONL file line by line."""
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    yield json.loads(line)
