"""
Dataset Processor — Tokenization and preprocessing for OpenLoRA.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from datasets import Dataset
from transformers import PreTrainedTokenizer


@dataclass
class ProcessorConfig:
    """Configuration for dataset processing."""

    max_length: int = 2048
    truncation: bool = True
    padding: str = "max_length"
    text_column: str = "text"
    label_column: str | None = None
    num_proc: int = 4
    remove_columns: bool = True


class DatasetProcessor:
    """Process datasets for training."""

    def __init__(
        self,
        tokenizer: PreTrainedTokenizer,
        config: ProcessorConfig | None = None,
    ):
        self.tokenizer = tokenizer
        self.config = config or ProcessorConfig()

    def tokenize(self, dataset: Dataset) -> Dataset:
        """Tokenize dataset for causal LM training.

        Args:
            dataset: Dataset with text column.

        Returns:
            Tokenized dataset with input_ids and attention_mask.
        """

        def tokenize_fn(examples: dict[str, Any]) -> dict[str, Any]:
            texts = examples[self.config.text_column]
            tokenized = self.tokenizer(
                texts,
                max_length=self.config.max_length,
                truncation=self.config.truncation,
                padding=self.config.padding,
                return_tensors=None,
            )
            # For causal LM, labels = input_ids
            tokenized["labels"] = tokenized["input_ids"].copy()
            return tokenized

        remove_cols = dataset.column_names if self.config.remove_columns else None

        return dataset.map(
            tokenize_fn,
            batched=True,
            num_proc=self.config.num_proc,
            remove_columns=remove_cols,
            desc="Tokenizing",
        )

    def tokenize_instruction(
        self,
        dataset: Dataset,
        instruction_column: str = "instruction",
        response_column: str = "response",
        template: str = "### Instruction:\n{instruction}\n\n### Response:\n{response}",
    ) -> Dataset:
        """Tokenize instruction-response dataset.

        Args:
            dataset: Dataset with instruction and response columns.
            instruction_column: Name of instruction column.
            response_column: Name of response column.
            template: Format template for combining instruction and response.

        Returns:
            Tokenized dataset.
        """

        def format_fn(examples: dict[str, Any]) -> dict[str, Any]:
            texts = []
            for inst, resp in zip(
                examples[instruction_column],
                examples[response_column],
            ):
                text = template.format(instruction=inst, response=resp)
                texts.append(text)
            return {self.config.text_column: texts}

        # First format, then tokenize
        formatted = dataset.map(
            format_fn,
            batched=True,
            num_proc=self.config.num_proc,
            remove_columns=dataset.column_names,
            desc="Formatting",
        )

        return self.tokenize(formatted)

    def filter_by_length(
        self,
        dataset: Dataset,
        min_tokens: int = 10,
        max_tokens: int | None = None,
    ) -> Dataset:
        """Filter dataset by token count."""

        max_tokens = max_tokens or self.config.max_length

        def length_filter(example: dict[str, Any]) -> bool:
            length = len(example["input_ids"])
            return min_tokens <= length <= max_tokens

        return dataset.filter(length_filter, desc="Filtering by length")

    def shard(
        self,
        dataset: Dataset,
        num_shards: int,
        shard_index: int,
    ) -> Dataset:
        """Get a shard of the dataset for distributed training."""
        return dataset.shard(num_shards=num_shards, index=shard_index)
