// Package deployment manages deployment lifecycle and traffic routing.
package deployment

import (
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"
)

// DeploymentStatus represents the state of a deployment.
type DeploymentStatus string

const (
	StatusPending     DeploymentStatus = "pending"
	StatusDeploying   DeploymentStatus = "deploying"
	StatusHealthy     DeploymentStatus = "healthy"
	StatusUnhealthy   DeploymentStatus = "unhealthy"
	StatusFailed      DeploymentStatus = "failed"
	StatusRollingBack DeploymentStatus = "rolling_back"
)

// Environment represents the target environment.
type Environment string

const (
	EnvDev     Environment = "development"
	EnvStaging Environment = "staging"
	EnvProd    Environment = "production"
)

// Deployment represents a deployed adapter.
type Deployment struct {
	ID          string            `json:"id"`
	AdapterID   string            `json:"adapter_id"`
	Version     int               `json:"version"`
	Environment Environment       `json:"environment"`
	Status      DeploymentStatus  `json:"status"`
	Replicas    int               `json:"replicas"`
	TrafficPct  int               `json:"traffic_percentage"` // 0-100
	Config      map[string]string `json:"config,omitempty"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}

// Manager handles deployment operations.
type Manager struct {
	mu          sync.RWMutex
	deployments map[string]*Deployment
}

// NewManager creates a new deployment manager.
func NewManager() *Manager {
	return &Manager{
		deployments: make(map[string]*Deployment),
	}
}

// Deploy creates or updates a deployment.
func (m *Manager) Deploy(d *Deployment) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if d.ID == "" {
		d.ID = uuid.New().String()
		d.CreatedAt = time.Now()
	}
	d.UpdatedAt = time.Now()
	d.Status = StatusPending // Async deployment simulation

	m.deployments[d.ID] = d

	// Simulate deployment process
	go func(id string) {
		time.Sleep(2 * time.Second) // Simulate latency
		m.mu.Lock()
		if dep, ok := m.deployments[id]; ok {
			dep.Status = StatusHealthy
			dep.UpdatedAt = time.Now()
		}
		m.mu.Unlock()
	}(d.ID)

	return nil
}

// Get retrieves a deployment by ID.
func (m *Manager) Get(id string) (*Deployment, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if d, ok := m.deployments[id]; ok {
		return d, nil
	}
	return nil, errors.New("deployment not found")
}

// List retrieves deployments with filters.
func (m *Manager) List(env Environment) []*Deployment {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var result []*Deployment
	for _, d := range m.deployments {
		if env == "" || d.Environment == env {
			result = append(result, d)
		}
	}
	return result
}

// SetTraffic updates the traffic split for a deployment.
func (m *Manager) SetTraffic(id string, percentage int) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	d, ok := m.deployments[id]
	if !ok {
		return errors.New("deployment not found")
	}

	if percentage < 0 || percentage > 100 {
		return errors.New("invalid percentage")
	}

	d.TrafficPct = percentage
	d.UpdatedAt = time.Now()
	return nil
}

// Rollback reverts a deployment to a previous state (simplified).
func (m *Manager) Rollback(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	d, ok := m.deployments[id]
	if !ok {
		return errors.New("deployment not found")
	}

	d.Status = StatusRollingBack
	// Logic to revert would go here
	return nil
}
