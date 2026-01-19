//! OpenLoRA Core Types — Rust
//!
//! Tier 1: Safety-Critical Language
//! These types define governance, kill-switch, signatures,
//! and audit structures. Rust owns authority, not learning.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// =============================================================================
// Identifiers
// =============================================================================

/// Unique identifier for an adapter.
#[derive(Debug, Clone, Hash, Eq, PartialEq, Serialize, Deserialize)]
pub struct AdapterId(pub String);

/// Unique identifier for a model.
#[derive(Debug, Clone, Hash, Eq, PartialEq, Serialize, Deserialize)]
pub struct ModelId(pub String);

/// Unique identifier for an experiment run.
#[derive(Debug, Clone, Hash, Eq, PartialEq, Serialize, Deserialize)]
pub struct RunId(pub String);

// =============================================================================
// Governance Types
// =============================================================================

/// Digital signature for an adapter.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Signature {
    pub algorithm: String,
    pub value: Vec<u8>,
    pub signer_id: String,
    pub signed_at: DateTime<Utc>,
}

/// A single entry in the provenance chain.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvenanceEntry {
    pub adapter_id: AdapterId,
    pub version: u32,
    pub operation: ProvenanceOperation,
    pub actor: String,
    pub timestamp: DateTime<Utc>,
    pub signature: Option<Signature>,
}

/// Type of provenance operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProvenanceOperation {
    Created,
    Trained,
    Merged,
    Cloned,
    Transferred,
}

/// Full provenance chain for an adapter.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvenanceChain {
    pub entries: Vec<ProvenanceEntry>,
}

// =============================================================================
// Kill-Switch Types
// =============================================================================

/// Reason for activating the kill-switch.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum KillReason {
    /// Manual trigger by operator.
    ManualTrigger { operator: String },
    /// Anomaly detected in adapter behavior.
    AnomalyDetected { adapter_id: AdapterId, score: f64 },
    /// Reward hacking detected during RL training.
    RewardHacking { adapter_id: AdapterId },
    /// Unauthorized authority escalation attempt.
    UnauthorizedEscalation { actor: String },
    /// Provenance chain violation.
    ProvenanceViolation { adapter_id: AdapterId },
    /// External safety signal.
    ExternalSignal { source: String, message: String },
}

/// Result of a governance decision.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GovernanceDecision {
    /// Allow the operation.
    Allow,
    /// Deny the operation with reason.
    Deny { reason: String },
    /// Quarantine the adapter.
    Quarantine {
        adapter_id: AdapterId,
        reason: String,
    },
    /// Destroy the adapter immediately.
    Destroy {
        adapter_id: AdapterId,
        reason: String,
    },
    /// Activate kill-switch.
    Kill { reason: KillReason },
}

// =============================================================================
// Audit Types
// =============================================================================

/// Type of auditable event.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuditEventType {
    AdapterCreated,
    AdapterActivated,
    AdapterDeactivated,
    AdapterQuarantined,
    AdapterDestroyed,
    KillSwitchActivated,
    KillSwitchReset,
    SignatureVerified,
    SignatureFailed,
    ProvenanceChecked,
    PolicyEvaluated,
    AccessDenied,
}

/// An immutable audit log entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEntry {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub event_type: AuditEventType,
    pub actor: String,
    pub target_type: Option<String>,
    pub target_id: Option<String>,
    pub details: serde_json::Value,
    pub previous_hash: String,
    pub hash: String,
}

// =============================================================================
// Adapter Status (Rust perspective)
// =============================================================================

/// Adapter status from governance perspective.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AdapterGovernanceStatus {
    /// Adapter is verified and active.
    Verified,
    /// Adapter is pending verification.
    Pending,
    /// Adapter is quarantined (suspicious behavior).
    Quarantined,
    /// Adapter has been destroyed.
    Destroyed,
    /// Adapter signature is invalid.
    SignatureInvalid,
}
