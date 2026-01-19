"""
LoRA Trainer — Core training engine for OpenLoRA.

INVARIANT: Base model weights are NEVER modified.
Only LoRA adapter parameters are updated during training.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Callable
from uuid import UUID, uuid4

import torch
from datasets import Dataset
from peft import get_peft_model, PeftModel
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    PreTrainedModel,
    PreTrainedTokenizer,
    Trainer,
    DataCollatorForLanguageModeling,
)

from openlab.config import LoRAConfig, TrainingConfig

logger = logging.getLogger(__name__)


@dataclass
class TrainingResult:
    """Result of a training run."""

    adapter_id: UUID
    run_id: UUID
    base_model: str
    adapter_path: str
    final_loss: float
    total_steps: int
    training_time_seconds: float
    config: dict[str, Any]


class LoRATrainer:
    """Train LoRA adapters.

    Hard Rule: Base model weights are FROZEN and never modified.
    """

    def __init__(
        self,
        model_name: str,
        lora_config: LoRAConfig | None = None,
        training_config: TrainingConfig | None = None,
        device: str | None = None,
    ):
        self.model_name = model_name
        self.lora_config = lora_config or LoRAConfig()
        self.training_config = training_config or TrainingConfig()
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")

        self._model: PreTrainedModel | None = None
        self._tokenizer: PreTrainedTokenizer | None = None
        self._peft_model: PeftModel | None = None

    def load_model(self, load_in_8bit: bool = False, load_in_4bit: bool = False) -> None:
        """Load base model and tokenizer.

        Args:
            load_in_8bit: Use 8-bit quantization.
            load_in_4bit: Use 4-bit quantization.
        """
        logger.info(f"Loading model: {self.model_name}")

        quantization_config = None
        if load_in_4bit:
            from transformers import BitsAndBytesConfig
            quantization_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.bfloat16,
                bnb_4bit_quant_type="nf4",
            )

        self._model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            quantization_config=quantization_config,
            load_in_8bit=load_in_8bit if not load_in_4bit else False,
            torch_dtype=torch.bfloat16 if self.training_config.bf16 else torch.float32,
            device_map="auto" if self.device == "cuda" else None,
            trust_remote_code=True,
        )

        self._tokenizer = AutoTokenizer.from_pretrained(
            self.model_name,
            trust_remote_code=True,
        )
        if self._tokenizer.pad_token is None:
            self._tokenizer.pad_token = self._tokenizer.eos_token

        # CRITICAL: Freeze base model
        self._freeze_base_model()

        logger.info("Model loaded successfully")

    def _freeze_base_model(self) -> None:
        """Freeze all base model parameters."""
        for param in self._model.parameters():
            param.requires_grad = False
        logger.info("Base model frozen — weights will NOT be modified")

    def prepare_lora(self) -> None:
        """Apply LoRA adapters to the model."""
        if self._model is None:
            raise RuntimeError("Model not loaded. Call load_model() first.")

        peft_config = self.lora_config.to_peft_config()
        self._peft_model = get_peft_model(self._model, peft_config)

        # Log trainable parameters
        trainable, total = self._count_parameters()
        logger.info(
            f"LoRA applied — Trainable: {trainable:,} / {total:,} "
            f"({100 * trainable / total:.2f}%)"
        )

    def _count_parameters(self) -> tuple[int, int]:
        """Count trainable and total parameters."""
        trainable = sum(p.numel() for p in self._peft_model.parameters() if p.requires_grad)
        total = sum(p.numel() for p in self._peft_model.parameters())
        return trainable, total

    def train(
        self,
        dataset: Dataset,
        output_dir: str | Path,
        callbacks: list[Callable] | None = None,
    ) -> TrainingResult:
        """Train LoRA adapter on dataset.

        Args:
            dataset: Tokenized dataset with input_ids, attention_mask, labels.
            output_dir: Directory to save adapter.
            callbacks: Optional training callbacks.

        Returns:
            TrainingResult with training metrics.
        """
        if self._peft_model is None:
            raise RuntimeError("LoRA not prepared. Call prepare_lora() first.")

        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        run_id = uuid4()
        adapter_id = uuid4()
        start_time = datetime.now()

        logger.info(f"Starting training run: {run_id}")

        # Data collator
        data_collator = DataCollatorForLanguageModeling(
            tokenizer=self._tokenizer,
            mlm=False,
        )

        # Training arguments
        training_args = self.training_config.to_training_arguments(str(output_dir))

        # Trainer
        trainer = Trainer(
            model=self._peft_model,
            args=training_args,
            train_dataset=dataset,
            data_collator=data_collator,
        )

        # Train
        train_result = trainer.train()

        # Save adapter only (not base model)
        adapter_path = output_dir / "adapter"
        self._peft_model.save_pretrained(str(adapter_path))
        self._tokenizer.save_pretrained(str(adapter_path))

        training_time = (datetime.now() - start_time).total_seconds()

        result = TrainingResult(
            adapter_id=adapter_id,
            run_id=run_id,
            base_model=self.model_name,
            adapter_path=str(adapter_path),
            final_loss=train_result.training_loss,
            total_steps=train_result.global_step,
            training_time_seconds=training_time,
            config={
                "lora": self.lora_config.__dict__,
                "training": self.training_config.__dict__,
            },
        )

        logger.info(
            f"Training complete — Loss: {result.final_loss:.4f}, "
            f"Steps: {result.total_steps}, Time: {training_time:.1f}s"
        )

        return result

    @property
    def tokenizer(self) -> PreTrainedTokenizer:
        """Get the tokenizer."""
        if self._tokenizer is None:
            raise RuntimeError("Tokenizer not loaded. Call load_model() first.")
        return self._tokenizer

    @property
    def model(self) -> PeftModel:
        """Get the PEFT model."""
        if self._peft_model is None:
            raise RuntimeError("Model not prepared. Call prepare_lora() first.")
        return self._peft_model
