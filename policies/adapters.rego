# OpenLoRA Adapter Policies
#
# Rego policies for adapter permissions and safety constraints.
# Evaluated by OPA (Open Policy Agent) before adapter operations.

package openlora.adapters

import future.keywords.if
import future.keywords.in

# Default deny adapter activation
default allow_activation := false

# Allow activation if all checks pass
allow_activation if {
    adapter_is_signed
    adapter_not_quarantined
    owner_is_authorized
    resource_limits_ok
}

# Adapter must have valid signature
adapter_is_signed if {
    input.adapter.signature != null
    input.adapter.signature.verified == true
}

# Adapter must not be quarantined
adapter_not_quarantined if {
    input.adapter.status != "quarantined"
}

# Owner must be in authorized list
owner_is_authorized if {
    input.adapter.owner_id in data.authorized_owners
}

# Resource usage must be within limits
resource_limits_ok if {
    input.adapter.config.rank <= data.max_lora_rank
    input.adapter.config.rank >= data.min_lora_rank
}

# Deny reasons for debugging
deny_reasons[reason] if {
    not adapter_is_signed
    reason := "adapter_not_signed"
}

deny_reasons[reason] if {
    input.adapter.status == "quarantined"
    reason := "adapter_quarantined"
}

deny_reasons[reason] if {
    not input.adapter.owner_id in data.authorized_owners
    reason := "owner_not_authorized"
}

deny_reasons[reason] if {
    input.adapter.config.rank > data.max_lora_rank
    reason := "lora_rank_too_high"
}
