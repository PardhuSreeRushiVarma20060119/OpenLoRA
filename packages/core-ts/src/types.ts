/**
 * OpenLoRA Core Types — TypeScript
 *
 * Tier 3: UI Language
 * These types mirror Python/Rust definitions for the Studio UI.
 */

// =============================================================================
// Enums
// =============================================================================

export type AdapterStatus = 'active' | 'training' | 'quarantined' | 'archived' | 'destroyed';

export type AdapterTask = 'CAUSAL_LM' | 'SEQ_2_SEQ_LM' | 'SEQ_CLS' | 'TOKEN_CLS';

export type ExperimentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'killed';

export type AuditEventType =
    | 'adapter_created'
    | 'adapter_activated'
    | 'adapter_quarantined'
    | 'adapter_destroyed'
    | 'kill_switch_activated'
    | 'signature_verified'
    | 'policy_evaluated';

// =============================================================================
// Core Types
// =============================================================================

export interface AdapterConfig {
    rank: number;
    alpha: number;
    dropout: number;
    targetModules: string[];
    bias: 'none' | 'all' | 'lora_only';
}

export interface AdapterMetadata {
    description?: string;
    tags: string[];
    trainedOn?: string;
    accuracy?: number;
    signature?: string;
}

export interface Adapter {
    id: string;
    name: string;
    version: number;
    baseModelId: string;
    task: AdapterTask;
    config: AdapterConfig;
    status: AdapterStatus;
    metadata: AdapterMetadata;
    storagePath: string;
    checksum: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
    parentAdapterId?: string;
}

export interface BaseModel {
    id: string;
    name: string;
    architecture: string;
    parameterCount: number;
    storagePath: string;
    checksum: string;
    createdAt: Date;
}

export interface DatasetVersion {
    id: string;
    datasetId: string;
    version: number;
    parentVersionId?: string;
    checksum: string;
    rowCount: number;
    storagePath: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
}

export interface Metrics {
    loss?: number;
    perplexity?: number;
    accuracy?: number;
    gradientNorm?: number;
    learningRate?: number;
    step?: number;
    epoch?: number;
    custom: Record<string, number>;
}

export interface ExperimentRun {
    id: string;
    adapterId?: string;
    datasetVersionId: string;
    config: ExperimentConfig;
    status: ExperimentStatus;
    metrics: Metrics;
    startedAt?: Date;
    completedAt?: Date;
    createdAt: Date;
}

export interface ExperimentConfig {
    adapterConfig: AdapterConfig;
    learningRate: number;
    batchSize: number;
    epochs: number;
    gradientAccumulationSteps: number;
    warmupSteps: number;
    seed: number;
}

// =============================================================================
// Governance Types (from Rust)
// =============================================================================

export interface AuditEntry {
    id: string;
    timestamp: Date;
    eventType: AuditEventType;
    actor: string;
    targetType?: string;
    targetId?: string;
    details: Record<string, unknown>;
    previousHash: string;
    hash: string;
}

export type KillReason =
    | { type: 'manual_trigger'; operator: string }
    | { type: 'anomaly_detected'; adapterId: string; score: number }
    | { type: 'reward_hacking'; adapterId: string }
    | { type: 'unauthorized_escalation'; actor: string }
    | { type: 'provenance_violation'; adapterId: string };

export type GovernanceDecision =
    | { type: 'allow' }
    | { type: 'deny'; reason: string }
    | { type: 'quarantine'; adapterId: string; reason: string }
    | { type: 'destroy'; adapterId: string; reason: string }
    | { type: 'kill'; reason: KillReason };
