//! Kill-Switch Implementation
//!
//! Hard kill-switch for adapter and training termination.
//! INVARIANT: This can only be triggered by Rust, never by Python.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use thiserror::Error;

/// Global kill-switch state.
static KILL_SWITCH_ACTIVE: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum KillReason {
    ManualTrigger { operator: String },
    AnomalyDetected { adapter_id: String, score: f64 },
    RewardHacking { adapter_id: String },
    UnauthorizedEscalation { actor: String },
    ProvenanceViolation { adapter_id: String },
    ExternalSignal { source: String, message: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KillEvent {
    pub id: String,
    pub reason: KillReason,
    pub timestamp: DateTime<Utc>,
    pub triggered_by: String,
    pub affected_adapters: Vec<String>,
}

#[derive(Debug, Error)]
pub enum KillSwitchError {
    #[error("Kill-switch already active")]
    AlreadyActive,
    #[error("Kill-switch not active")]
    NotActive,
    #[error("Unauthorized: {0}")]
    Unauthorized(String),
}

pub struct KillSwitch {
    active: Arc<AtomicBool>,
    events: Vec<KillEvent>,
    authorized_operators: Vec<String>,
}

impl KillSwitch {
    pub fn new(authorized_operators: Vec<String>) -> Self {
        Self {
            active: Arc::new(AtomicBool::new(false)),
            events: Vec::new(),
            authorized_operators,
        }
    }

    /// Activate the kill-switch.
    ///
    /// CRITICAL: This immediately terminates all adapter operations.
    pub fn activate(
        &mut self,
        operator: &str,
        reason: KillReason,
        affected_adapters: Vec<String>,
    ) -> Result<KillEvent, KillSwitchError> {
        // Verify operator is authorized
        if !self.authorized_operators.contains(&operator.to_string()) {
            return Err(KillSwitchError::Unauthorized(operator.to_string()));
        }

        // Set global kill state
        if self.active.swap(true, Ordering::SeqCst) {
            return Err(KillSwitchError::AlreadyActive);
        }

        // Also set static flag for cross-module access
        KILL_SWITCH_ACTIVE.store(true, Ordering::SeqCst);

        let event = KillEvent {
            id: uuid::Uuid::new_v4().to_string(),
            reason,
            timestamp: Utc::now(),
            triggered_by: operator.to_string(),
            affected_adapters,
        };

        self.events.push(event.clone());

        eprintln!("🚨 KILL-SWITCH ACTIVATED by {} at {}", operator, event.timestamp);

        Ok(event)
    }

    /// Reset the kill-switch (requires authorization).
    pub fn reset(&mut self, operator: &str) -> Result<(), KillSwitchError> {
        if !self.authorized_operators.contains(&operator.to_string()) {
            return Err(KillSwitchError::Unauthorized(operator.to_string()));
        }

        if !self.active.swap(false, Ordering::SeqCst) {
            return Err(KillSwitchError::NotActive);
        }

        KILL_SWITCH_ACTIVE.store(false, Ordering::SeqCst);

        eprintln!("✅ Kill-switch reset by {} at {}", operator, Utc::now());

        Ok(())
    }

    /// Check if kill-switch is active.
    pub fn is_active(&self) -> bool {
        self.active.load(Ordering::SeqCst)
    }

    /// Get all kill events.
    pub fn get_events(&self) -> &[KillEvent] {
        &self.events
    }
}

/// Check if global kill-switch is active.
/// Can be called from anywhere to check system state.
pub fn is_killed() -> bool {
    KILL_SWITCH_ACTIVE.load(Ordering::SeqCst)
}
