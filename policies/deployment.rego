# OpenLoRA Deployment Policies
#
# Constraints for deploying adapters to production.

package openlora.deployment

import future.keywords.if
import future.keywords.in

# Default deny deployment
default allow_deployment := false

# Allow deployment if all checks pass
allow_deployment if {
    adapter_is_approved
    environment_is_valid
    canary_passed
    safety_score_ok
}

# Adapter must be in approved status
adapter_is_approved if {
    input.adapter.status == "active"
    input.adapter.approval_status == "approved"
}

# Target environment must be valid
environment_is_valid if {
    input.environment in ["development", "staging", "production"]
}

# Production requires canary testing
canary_passed if {
    input.environment != "production"
}

canary_passed if {
    input.environment == "production"
    input.canary_results.success_rate >= 0.99
    input.canary_results.latency_p99_ms <= 500
}

# Safety score must meet threshold
safety_score_ok if {
    input.adapter.safety_score >= data.min_safety_score
}

# Deployment constraints
max_replicas := 10

replicas_valid if {
    input.replicas <= max_replicas
}

# Rollback required if safety drops
require_rollback if {
    input.live_metrics.safety_score < input.adapter.safety_score * 0.9
}

# Deny reasons
deny_reasons[reason] if {
    input.adapter.status != "active"
    reason := "adapter_not_active"
}

deny_reasons[reason] if {
    input.environment == "production"
    input.canary_results.success_rate < 0.99
    reason := "canary_success_rate_too_low"
}

deny_reasons[reason] if {
    input.adapter.safety_score < data.min_safety_score
    reason := "safety_score_too_low"
}
