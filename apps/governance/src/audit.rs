//! Immutable Audit Log
//!
//! Append-only audit log with hash chain for integrity.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::{File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use thiserror::Error;

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
    PolicyEvaluated,
    AccessDenied,
    TrainingStarted,
    TrainingCompleted,
    TrainingFailed,
}

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

#[derive(Debug, Error)]
pub enum AuditError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("Integrity violation: expected {expected}, got {actual}")]
    IntegrityViolation { expected: String, actual: String },
}

pub struct AuditLog {
    path: PathBuf,
    last_hash: String,
}

impl AuditLog {
    /// Create or open an audit log.
    pub fn open(path: PathBuf) -> Result<Self, AuditError> {
        let last_hash = if path.exists() {
            Self::get_last_hash(&path)?
        } else {
            "genesis".to_string()
        };

        Ok(Self { path, last_hash })
    }

    fn get_last_hash(path: &PathBuf) -> Result<String, AuditError> {
        let file = File::open(path)?;
        let reader = BufReader::new(file);
        let mut last_hash = "genesis".to_string();

        for line in reader.lines() {
            let line = line?;
            if !line.trim().is_empty() {
                let entry: AuditEntry = serde_json::from_str(&line)?;
                last_hash = entry.hash;
            }
        }

        Ok(last_hash)
    }

    /// Append an audit entry (immutable - cannot be modified).
    pub fn append(
        &mut self,
        event_type: AuditEventType,
        actor: &str,
        target_type: Option<&str>,
        target_id: Option<&str>,
        details: serde_json::Value,
    ) -> Result<AuditEntry, AuditError> {
        let id = uuid::Uuid::new_v4().to_string();
        let timestamp = Utc::now();
        let previous_hash = self.last_hash.clone();

        // Compute hash
        let hash = self.compute_hash(&id, &timestamp, &event_type, actor, &details, &previous_hash);

        let entry = AuditEntry {
            id,
            timestamp,
            event_type,
            actor: actor.to_string(),
            target_type: target_type.map(String::from),
            target_id: target_id.map(String::from),
            details,
            previous_hash,
            hash: hash.clone(),
        };

        // Append to file
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.path)?;

        writeln!(file, "{}", serde_json::to_string(&entry)?)?;

        self.last_hash = hash;

        Ok(entry)
    }

    fn compute_hash(
        &self,
        id: &str,
        timestamp: &DateTime<Utc>,
        event_type: &AuditEventType,
        actor: &str,
        details: &serde_json::Value,
        previous_hash: &str,
    ) -> String {
        let mut hasher = Sha256::new();
        hasher.update(id.as_bytes());
        hasher.update(timestamp.to_rfc3339().as_bytes());
        hasher.update(format!("{:?}", event_type).as_bytes());
        hasher.update(actor.as_bytes());
        hasher.update(details.to_string().as_bytes());
        hasher.update(previous_hash.as_bytes());
        format!("{:x}", hasher.finalize())[..16].to_string()
    }

    /// Verify integrity of the entire audit log.
    pub fn verify_integrity(&self) -> Result<bool, AuditError> {
        if !self.path.exists() {
            return Ok(true);
        }

        let file = File::open(&self.path)?;
        let reader = BufReader::new(file);
        let mut expected_prev = "genesis".to_string();

        for line in reader.lines() {
            let line = line?;
            if line.trim().is_empty() {
                continue;
            }

            let entry: AuditEntry = serde_json::from_str(&line)?;

            if entry.previous_hash != expected_prev {
                return Err(AuditError::IntegrityViolation {
                    expected: expected_prev,
                    actual: entry.previous_hash,
                });
            }

            let computed = self.compute_hash(
                &entry.id,
                &entry.timestamp,
                &entry.event_type,
                &entry.actor,
                &entry.details,
                &entry.previous_hash,
            );

            if computed != entry.hash {
                return Err(AuditError::IntegrityViolation {
                    expected: computed,
                    actual: entry.hash,
                });
            }

            expected_prev = entry.hash;
        }

        Ok(true)
    }
}
