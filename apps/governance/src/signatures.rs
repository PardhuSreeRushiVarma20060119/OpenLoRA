//! Signature Verification
//!
//! Verify adapter signatures and provenance chains.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use thiserror::Error;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Signature {
    pub algorithm: String,
    pub value: String,
    pub signer_id: String,
    pub signed_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvenanceEntry {
    pub adapter_id: String,
    pub version: u32,
    pub operation: String,
    pub actor: String,
    pub timestamp: DateTime<Utc>,
    pub signature: Option<Signature>,
    pub parent_hash: Option<String>,
    pub hash: String,
}

#[derive(Debug, Error)]
pub enum SignatureError {
    #[error("Invalid signature")]
    InvalidSignature,
    #[error("Signature expired")]
    Expired,
    #[error("Unknown signer: {0}")]
    UnknownSigner(String),
    #[error("Provenance chain broken at {0}")]
    BrokenChain(String),
}

pub struct SignatureVerifier {
    trusted_signers: Vec<String>,
}

impl SignatureVerifier {
    pub fn new(trusted_signers: Vec<String>) -> Self {
        Self { trusted_signers }
    }

    /// Verify a signature against content.
    pub fn verify(
        &self,
        content: &[u8],
        signature: &Signature,
    ) -> Result<bool, SignatureError> {
        // Check signer is trusted
        if !self.trusted_signers.contains(&signature.signer_id) {
            return Err(SignatureError::UnknownSigner(signature.signer_id.clone()));
        }

        // Compute expected hash
        let mut hasher = Sha256::new();
        hasher.update(content);
        hasher.update(signature.signer_id.as_bytes());
        hasher.update(signature.signed_at.to_rfc3339().as_bytes());
        let expected = format!("{:x}", hasher.finalize());

        // In production, this would use proper cryptographic verification
        // For now, we verify the hash matches
        Ok(signature.value == expected[..16])
    }

    /// Sign content (creates signature).
    pub fn sign(&self, content: &[u8], signer_id: &str) -> Signature {
        let now = Utc::now();

        let mut hasher = Sha256::new();
        hasher.update(content);
        hasher.update(signer_id.as_bytes());
        hasher.update(now.to_rfc3339().as_bytes());
        let hash = format!("{:x}", hasher.finalize());

        Signature {
            algorithm: "sha256".to_string(),
            value: hash[..16].to_string(),
            signer_id: signer_id.to_string(),
            signed_at: now,
        }
    }

    /// Verify a provenance chain.
    pub fn verify_provenance(
        &self,
        chain: &[ProvenanceEntry],
    ) -> Result<bool, SignatureError> {
        if chain.is_empty() {
            return Ok(true);
        }

        for (i, entry) in chain.iter().enumerate() {
            // First entry should have no parent
            if i == 0 && entry.parent_hash.is_some() {
                return Err(SignatureError::BrokenChain(entry.adapter_id.clone()));
            }

            // Subsequent entries must reference previous hash
            if i > 0 {
                let expected_parent = &chain[i - 1].hash;
                match &entry.parent_hash {
                    Some(parent) if parent == expected_parent => {}
                    _ => return Err(SignatureError::BrokenChain(entry.adapter_id.clone())),
                }
            }

            // Verify hash is correct
            let computed = self.compute_entry_hash(entry);
            if computed != entry.hash {
                return Err(SignatureError::BrokenChain(entry.adapter_id.clone()));
            }
        }

        Ok(true)
    }

    fn compute_entry_hash(&self, entry: &ProvenanceEntry) -> String {
        let mut hasher = Sha256::new();
        hasher.update(entry.adapter_id.as_bytes());
        hasher.update(entry.version.to_le_bytes());
        hasher.update(entry.operation.as_bytes());
        hasher.update(entry.actor.as_bytes());
        hasher.update(entry.timestamp.to_rfc3339().as_bytes());
        if let Some(ref parent) = entry.parent_hash {
            hasher.update(parent.as_bytes());
        }
        format!("{:x}", hasher.finalize())[..16].to_string()
    }
}
