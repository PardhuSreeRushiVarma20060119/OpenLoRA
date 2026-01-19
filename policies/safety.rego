# OpenLoRA Safety Policies
#
# Safety constraints for training and inference.

package openlora.safety

import future.keywords.if

# Default deny unsafe operations
default allow_training := false
default allow_inference := false

# Allow training if safety checks pass
allow_training if {
    base_model_approved
    dataset_approved
    resource_constraints_met
    not kill_switch_active
}

# Base model must be in approved list
base_model_approved if {
    input.base_model in data.approved_base_models
}

# Dataset must be approved
dataset_approved if {
    input.dataset.approved == true
    input.dataset.toxicity_score < 0.1
}

# Training resource constraints
resource_constraints_met if {
    input.resources.gpus <= data.max_training_gpus
    input.resources.memory_gb <= data.max_memory_gb
}

# Kill-switch check
kill_switch_active if {
    data.kill_switch.active == true
}

# Allow inference if checks pass
allow_inference if {
    adapter_verified
    not kill_switch_active
    rate_limit_ok
}

# Adapter must be verified
adapter_verified if {
    input.adapter.signature.verified == true
    input.adapter.status == "active"
}

# Rate limiting
rate_limit_ok if {
    input.requests_per_minute <= data.rate_limit_rpm
}

# Emergency actions
emergency_stop if {
    input.anomaly_score > data.anomaly_threshold
}

emergency_stop if {
    input.toxicity_detected == true
}

emergency_stop if {
    input.reward_hacking_detected == true
}

# Deny reasons
deny_reasons[reason] if {
    not base_model_approved
    reason := "base_model_not_approved"
}

deny_reasons[reason] if {
    input.dataset.toxicity_score >= 0.1
    reason := "dataset_toxicity_too_high"
}

deny_reasons[reason] if {
    kill_switch_active
    reason := "kill_switch_active"
}
