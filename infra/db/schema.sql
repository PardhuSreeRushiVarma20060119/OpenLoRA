-- OpenLoRA Database Schema
-- Phase 0: Core tables for adapters, models, datasets, experiments

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Core Tables
-- =============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    architecture VARCHAR(100) NOT NULL,
    parameter_count BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE adapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    base_model_id UUID NOT NULL REFERENCES models(id),
    task VARCHAR(50) NOT NULL,
    rank INTEGER NOT NULL DEFAULT 16,
    alpha REAL NOT NULL DEFAULT 32.0,
    dropout REAL NOT NULL DEFAULT 0.1,
    target_modules JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    storage_path TEXT NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    metadata JSONB DEFAULT '{}',
    owner_id UUID NOT NULL REFERENCES users(id),
    parent_adapter_id UUID REFERENCES adapters(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (name, version)
);

CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    owner_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dataset_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id),
    version INTEGER NOT NULL DEFAULT 1,
    parent_version_id UUID REFERENCES dataset_versions(id),
    checksum VARCHAR(64) NOT NULL,
    row_count BIGINT,
    storage_path TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (dataset_id, version)
);

CREATE TABLE experiment_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    adapter_id UUID REFERENCES adapters(id),
    dataset_version_id UUID NOT NULL REFERENCES dataset_versions(id),
    config JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    metrics JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    owner_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Audit Log (Immutable)
-- =============================================================================

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    actor VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    details JSONB NOT NULL DEFAULT '{}',
    previous_hash VARCHAR(64) NOT NULL,
    hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent updates/deletes on audit_log
CREATE RULE audit_no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE audit_no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX idx_adapters_status ON adapters(status);
CREATE INDEX idx_adapters_owner ON adapters(owner_id);
CREATE INDEX idx_adapters_base_model ON adapters(base_model_id);
CREATE INDEX idx_experiments_status ON experiment_runs(status);
CREATE INDEX idx_experiments_adapter ON experiment_runs(adapter_id);
CREATE INDEX idx_audit_event_type ON audit_log(event_type);
CREATE INDEX idx_audit_created_at ON audit_log(created_at);
