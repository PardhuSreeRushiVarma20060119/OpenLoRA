"""Tests for openlora.types module."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from openlora.types import (
    Adapter,
    AdapterConfig,
    AdapterMetadata,
    AdapterStatus,
    AdapterTask,
    BaseModel,
    DatasetVersion,
    ExperimentConfig,
    ExperimentRun,
    ExperimentStatus,
    Metrics,
)

# =============================================================================
# Enum tests
# =============================================================================


def test_adapter_status_values() -> None:
    assert AdapterStatus.ACTIVE == "active"
    assert AdapterStatus.TRAINING == "training"
    assert AdapterStatus.QUARANTINED == "quarantined"
    assert AdapterStatus.ARCHIVED == "archived"
    assert AdapterStatus.DESTROYED == "destroyed"


def test_adapter_task_values() -> None:
    assert AdapterTask.CAUSAL_LM == "CAUSAL_LM"
    assert AdapterTask.SEQ_2_SEQ_LM == "SEQ_2_SEQ_LM"
    assert AdapterTask.SEQ_CLS == "SEQ_CLS"
    assert AdapterTask.TOKEN_CLS == "TOKEN_CLS"


def test_experiment_status_values() -> None:
    assert ExperimentStatus.PENDING == "pending"
    assert ExperimentStatus.RUNNING == "running"
    assert ExperimentStatus.COMPLETED == "completed"
    assert ExperimentStatus.FAILED == "failed"
    assert ExperimentStatus.KILLED == "killed"


# =============================================================================
# AdapterConfig tests
# =============================================================================


def test_adapter_config_defaults() -> None:
    config = AdapterConfig()
    assert config.rank == 16
    assert config.alpha == 32.0
    assert config.dropout == 0.1
    assert config.bias == "none"
    assert "q_proj" in config.target_modules
    assert "v_proj" in config.target_modules


def test_adapter_config_custom() -> None:
    config = AdapterConfig(rank=8, alpha=16.0, dropout=0.05, bias="all")
    assert config.rank == 8
    assert config.alpha == 16.0
    assert config.dropout == 0.05
    assert config.bias == "all"


def test_adapter_config_target_modules_are_independent() -> None:
    config_a = AdapterConfig()
    config_b = AdapterConfig()
    config_a.target_modules.append("custom_proj")
    assert "custom_proj" not in config_b.target_modules


# =============================================================================
# AdapterMetadata tests
# =============================================================================


def test_adapter_metadata_defaults() -> None:
    meta = AdapterMetadata()
    assert meta.description is None
    assert meta.tags == []
    assert meta.trained_on is None
    assert meta.accuracy is None
    assert meta.signature is None


def test_adapter_metadata_with_values() -> None:
    meta = AdapterMetadata(
        description="A test adapter",
        tags=["nlp", "causal"],
        trained_on="custom-dataset-v1",
        accuracy=0.92,
        signature="abc123",
    )
    assert meta.description == "A test adapter"
    assert meta.tags == ["nlp", "causal"]
    assert meta.accuracy == 0.92


# =============================================================================
# Adapter tests
# =============================================================================


def test_adapter_creation() -> None:
    now = datetime.now(UTC)
    adapter = Adapter(
        id=uuid4(),
        name="test-adapter",
        version=1,
        base_model_id=uuid4(),
        task=AdapterTask.CAUSAL_LM,
        config=AdapterConfig(),
        status=AdapterStatus.ACTIVE,
        metadata=AdapterMetadata(),
        storage_path="/models/test",
        checksum="sha256:abc",
        owner_id=uuid4(),
        created_at=now,
        updated_at=now,
    )
    assert adapter.name == "test-adapter"
    assert adapter.version == 1
    assert adapter.task == AdapterTask.CAUSAL_LM
    assert adapter.status == AdapterStatus.ACTIVE
    assert adapter.parent_adapter_id is None


def test_adapter_with_parent() -> None:
    now = datetime.now(UTC)
    parent_id = uuid4()
    adapter = Adapter(
        id=uuid4(),
        name="child-adapter",
        version=2,
        base_model_id=uuid4(),
        task=AdapterTask.SEQ_CLS,
        config=AdapterConfig(),
        status=AdapterStatus.TRAINING,
        metadata=AdapterMetadata(),
        storage_path="/models/child",
        checksum="sha256:def",
        owner_id=uuid4(),
        created_at=now,
        updated_at=now,
        parent_adapter_id=parent_id,
    )
    assert adapter.parent_adapter_id == parent_id


# =============================================================================
# BaseModel tests
# =============================================================================


def test_base_model_creation() -> None:
    now = datetime.now(UTC)
    model = BaseModel(
        id=uuid4(),
        name="distilgpt2",
        architecture="GPT2",
        parameter_count=82_000_000,
        storage_path="/models/distilgpt2",
        checksum="sha256:xyz",
        created_at=now,
    )
    assert model.name == "distilgpt2"
    assert model.architecture == "GPT2"
    assert model.parameter_count == 82_000_000


# =============================================================================
# DatasetVersion tests
# =============================================================================


def test_dataset_version_creation() -> None:
    now = datetime.now(UTC)
    dv = DatasetVersion(
        id=uuid4(),
        dataset_id=uuid4(),
        version=1,
        parent_version_id=None,
        checksum="sha256:data",
        row_count=1000,
        storage_path="/datasets/v1",
        metadata={"format": "jsonl"},
        created_at=now,
    )
    assert dv.version == 1
    assert dv.row_count == 1000
    assert dv.parent_version_id is None
    assert dv.metadata["format"] == "jsonl"


# =============================================================================
# ExperimentConfig tests
# =============================================================================


def test_experiment_config_defaults() -> None:
    config = ExperimentConfig(adapter_config=AdapterConfig())
    assert config.learning_rate == pytest.approx(2e-4)
    assert config.batch_size == 8
    assert config.epochs == 3
    assert config.gradient_accumulation_steps == 4
    assert config.warmup_steps == 100
    assert config.seed == 42


def test_experiment_config_custom() -> None:
    config = ExperimentConfig(
        adapter_config=AdapterConfig(),
        learning_rate=1e-4,
        batch_size=4,
        epochs=5,
    )
    assert config.learning_rate == pytest.approx(1e-4)
    assert config.batch_size == 4
    assert config.epochs == 5


# =============================================================================
# Metrics tests
# =============================================================================


def test_metrics_defaults() -> None:
    m = Metrics()
    assert m.loss is None
    assert m.perplexity is None
    assert m.accuracy is None
    assert m.gradient_norm is None
    assert m.learning_rate is None
    assert m.step is None
    assert m.epoch is None
    assert m.custom == {}


def test_metrics_with_values() -> None:
    m = Metrics(loss=0.25, perplexity=1.28, step=100, epoch=1, custom={"bleu": 0.75})
    assert m.loss == pytest.approx(0.25)
    assert m.perplexity == pytest.approx(1.28)
    assert m.step == 100
    assert m.custom["bleu"] == pytest.approx(0.75)


def test_metrics_custom_dict_independent() -> None:
    m1 = Metrics()
    m2 = Metrics()
    m1.custom["foo"] = 1.0
    assert "foo" not in m2.custom


# =============================================================================
# ExperimentRun tests
# =============================================================================


def test_experiment_run_creation() -> None:
    now = datetime.now(UTC)
    run = ExperimentRun(
        id=uuid4(),
        adapter_id=None,
        dataset_version_id=uuid4(),
        config=ExperimentConfig(adapter_config=AdapterConfig()),
        status=ExperimentStatus.PENDING,
        metrics=Metrics(),
        started_at=None,
        completed_at=None,
        created_at=now,
    )
    assert run.status == ExperimentStatus.PENDING
    assert run.adapter_id is None
    assert run.started_at is None


def test_experiment_run_completed() -> None:
    start = datetime.now(UTC)
    end = datetime.now(UTC)
    run = ExperimentRun(
        id=uuid4(),
        adapter_id=uuid4(),
        dataset_version_id=uuid4(),
        config=ExperimentConfig(adapter_config=AdapterConfig()),
        status=ExperimentStatus.COMPLETED,
        metrics=Metrics(loss=0.1, accuracy=0.98),
        started_at=start,
        completed_at=end,
        created_at=start,
    )
    assert run.status == ExperimentStatus.COMPLETED
    assert run.metrics.loss == pytest.approx(0.1)
    assert run.metrics.accuracy == pytest.approx(0.98)
    assert run.completed_at is not None
