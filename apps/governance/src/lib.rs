//! OpenLoRA Governance Kernel
//!
//! Tier 1: Safety-Critical Rust Implementation
//! This module provides kill-switch, signature verification,
//! and immutable audit logging for the OpenLoRA platform.
//!
//! HARD RULE: Rust can KILL, Python cannot.

pub mod audit;
pub mod killswitch;
pub mod signatures;
pub mod cli;

pub use audit::AuditLog;
pub use killswitch::KillSwitch;
pub use signatures::SignatureVerifier;
