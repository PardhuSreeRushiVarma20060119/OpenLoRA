//! OpenLoRA Governance CLI Entry Point

use clap::Parser;
use openlora_governance::{cli::{Cli, Commands}, killswitch::{KillSwitch, KillReason, is_killed}, AuditLog};
use std::path::PathBuf;

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Kill { operator, reason, adapters } => {
            let mut ks = KillSwitch::new(vec![operator.clone()]);
            let reason = KillReason::ManualTrigger { operator: reason };
            
            match ks.activate(&operator, reason, adapters) {
                Ok(event) => {
                    println!("🚨 Kill-switch activated!");
                    println!("   Event ID: {}", event.id);
                    println!("   Time: {}", event.timestamp);
                }
                Err(e) => eprintln!("Error: {}", e),
            }
        }
        Commands::Reset { operator } => {
            let mut ks = KillSwitch::new(vec![operator.clone()]);
            match ks.reset(&operator) {
                Ok(()) => println!("✅ Kill-switch reset"),
                Err(e) => eprintln!("Error: {}", e),
            }
        }
        Commands::Status => {
            if is_killed() {
                println!("🚨 Kill-switch is ACTIVE");
            } else {
                println!("✅ Kill-switch is inactive");
            }
        }
        Commands::VerifyAudit { path } => {
            match AuditLog::open(PathBuf::from(&path)) {
                Ok(log) => {
                    match log.verify_integrity() {
                        Ok(true) => println!("✅ Audit log integrity verified"),
                        Ok(false) => println!("❌ Audit log integrity check failed"),
                        Err(e) => eprintln!("Error: {}", e),
                    }
                }
                Err(e) => eprintln!("Error opening log: {}", e),
            }
        }
        Commands::Sign { adapter, signer } => {
            println!("Signing adapter {} as {}", adapter, signer);
            // TODO: Implement full signing
        }
        Commands::Verify { adapter } => {
            println!("Verifying adapter {}", adapter);
            // TODO: Implement full verification
        }
    }
}
