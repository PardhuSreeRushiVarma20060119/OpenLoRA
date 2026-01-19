//! Governance CLI
//!
//! Command-line interface for governance operations.

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "openlora-gov")]
#[command(about = "OpenLoRA Governance CLI", long_about = None)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand)]
pub enum Commands {
    /// Activate kill-switch
    Kill {
        /// Operator ID
        #[arg(short, long)]
        operator: String,
        /// Reason for kill
        #[arg(short, long)]
        reason: String,
        /// Affected adapter IDs
        #[arg(short, long)]
        adapters: Vec<String>,
    },
    /// Reset kill-switch
    Reset {
        /// Operator ID
        #[arg(short, long)]
        operator: String,
    },
    /// Check kill-switch status
    Status,
    /// Verify audit log integrity
    VerifyAudit {
        /// Path to audit log
        #[arg(short, long)]
        path: String,
    },
    /// Sign an adapter
    Sign {
        /// Adapter path
        #[arg(short, long)]
        adapter: String,
        /// Signer ID
        #[arg(short, long)]
        signer: String,
    },
    /// Verify adapter signature
    Verify {
        /// Adapter path
        #[arg(short, long)]
        adapter: String,
    },
}
