"""
Training Configuration for OpenLab.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


@dataclass
class LoRAConfig:
    """LoRA adapter configuration."""

    rank: int = 16
    alpha: float = 32.0
    dropout: float = 0.1
    target_modules: list[str] = field(default_factory=lambda: [
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ])
    bias: Literal["none", "all", "lora_only"] = "none"
    task_type: str = "CAUSAL_LM"

    def to_peft_config(self):
        """Convert to PEFT LoraConfig."""
        from peft import LoraConfig as PeftLoraConfig, TaskType

        return PeftLoraConfig(
            r=self.rank,
            lora_alpha=self.alpha,
            lora_dropout=self.dropout,
            target_modules=self.target_modules,
            bias=self.bias,
            task_type=getattr(TaskType, self.task_type),
        )


@dataclass
class TrainingConfig:
    """Training configuration."""

    # Optimizer
    learning_rate: float = 2e-4
    weight_decay: float = 0.01
    adam_beta1: float = 0.9
    adam_beta2: float = 0.999
    adam_epsilon: float = 1e-8

    # Schedule
    num_epochs: int = 3
    warmup_ratio: float = 0.1
    lr_scheduler_type: str = "cosine"

    # Batching
    batch_size: int = 4
    gradient_accumulation_steps: int = 4
    max_grad_norm: float = 1.0

    # Precision
    bf16: bool = True
    fp16: bool = False

    # Checkpointing
    save_steps: int = 500
    save_total_limit: int = 3
    logging_steps: int = 10

    # Reproducibility
    seed: int = 42

    # Memory
    gradient_checkpointing: bool = True

    def to_training_arguments(self, output_dir: str):
        """Convert to HuggingFace TrainingArguments."""
        from transformers import TrainingArguments

        return TrainingArguments(
            output_dir=output_dir,
            learning_rate=self.learning_rate,
            weight_decay=self.weight_decay,
            adam_beta1=self.adam_beta1,
            adam_beta2=self.adam_beta2,
            adam_epsilon=self.adam_epsilon,
            num_train_epochs=self.num_epochs,
            warmup_ratio=self.warmup_ratio,
            lr_scheduler_type=self.lr_scheduler_type,
            per_device_train_batch_size=self.batch_size,
            gradient_accumulation_steps=self.gradient_accumulation_steps,
            max_grad_norm=self.max_grad_norm,
            bf16=self.bf16,
            fp16=self.fp16,
            save_steps=self.save_steps,
            save_total_limit=self.save_total_limit,
            logging_steps=self.logging_steps,
            seed=self.seed,
            gradient_checkpointing=self.gradient_checkpointing,
            report_to=[],  # We use our own tracking
            remove_unused_columns=False,
        )
