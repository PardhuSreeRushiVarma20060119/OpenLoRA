// Package allocator manages GPU and compute resource allocation.
package allocator

import (
	"errors"
	"sync"
	"time"
)

// GPUType represents GPU hardware type.
type GPUType string

const (
	GPUA100 GPUType = "A100"
	GPUH100 GPUType = "H100"
	GPUL40S GPUType = "L40S"
	GPUTPU  GPUType = "TPU-v4"
)

// GPU represents a single GPU resource.
type GPU struct {
	ID        string    `json:"id"`
	NodeID    string    `json:"node_id"`
	Type      GPUType   `json:"type"`
	MemoryGB  int       `json:"memory_gb"`
	Allocated bool      `json:"allocated"`
	JobID     string    `json:"job_id,omitempty"`
	AllocAt   time.Time `json:"allocated_at,omitempty"`
}

// Node represents a compute node with GPUs.
type Node struct {
	ID        string    `json:"id"`
	Address   string    `json:"address"`
	GPUs      []*GPU    `json:"gpus"`
	TotalMem  int       `json:"total_memory_gb"`
	UsedMem   int       `json:"used_memory_gb"`
	TotalCPUs int       `json:"total_cpus"`
	UsedCPUs  int       `json:"used_cpus"`
	Healthy   bool      `json:"healthy"`
	LastPing  time.Time `json:"last_ping"`
}

// Allocation represents a resource allocation for a job.
type Allocation struct {
	ID        string    `json:"id"`
	JobID     string    `json:"job_id"`
	NodeID    string    `json:"node_id"`
	GPUIDs    []string  `json:"gpu_ids"`
	MemoryGB  int       `json:"memory_gb"`
	CPUs      int       `json:"cpus"`
	CreatedAt time.Time `json:"created_at"`
}

// ResourceRequest specifies resource requirements.
type ResourceRequest struct {
	GPUs        int     `json:"gpus"`
	GPUType     GPUType `json:"gpu_type,omitempty"`
	MemoryGB    int     `json:"memory_gb"`
	CPUs        int     `json:"cpus"`
	MaxWaitSecs int     `json:"max_wait_secs,omitempty"`
}

// GPUAllocator manages GPU allocation across the cluster.
type GPUAllocator struct {
	mu          sync.RWMutex
	nodes       map[string]*Node
	allocations map[string]*Allocation
	quotas      map[string]*Quota
}

// Quota defines resource limits per user/team.
type Quota struct {
	UserID       string `json:"user_id"`
	MaxGPUs      int    `json:"max_gpus"`
	MaxMemoryGB  int    `json:"max_memory_gb"`
	UsedGPUs     int    `json:"used_gpus"`
	UsedMemoryGB int    `json:"used_memory_gb"`
}

// NewGPUAllocator creates a new allocator.
func NewGPUAllocator() *GPUAllocator {
	return &GPUAllocator{
		nodes:       make(map[string]*Node),
		allocations: make(map[string]*Allocation),
		quotas:      make(map[string]*Quota),
	}
}

// RegisterNode adds a compute node to the cluster.
func (a *GPUAllocator) RegisterNode(node *Node) {
	a.mu.Lock()
	defer a.mu.Unlock()

	node.Healthy = true
	node.LastPing = time.Now()
	a.nodes[node.ID] = node
}

// Allocate reserves resources for a job.
func (a *GPUAllocator) Allocate(jobID, userID string, req ResourceRequest) (*Allocation, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	// Check quota
	if quota, ok := a.quotas[userID]; ok {
		if quota.UsedGPUs+req.GPUs > quota.MaxGPUs {
			return nil, errors.New("quota exceeded: GPU limit")
		}
	}

	// Find suitable node
	for _, node := range a.nodes {
		if !node.Healthy {
			continue
		}

		gpus := a.findAvailableGPUs(node, req)
		if len(gpus) >= req.GPUs {
			// Allocate
			alloc := &Allocation{
				ID:        generateID(),
				JobID:     jobID,
				NodeID:    node.ID,
				GPUIDs:    make([]string, req.GPUs),
				MemoryGB:  req.MemoryGB,
				CPUs:      req.CPUs,
				CreatedAt: time.Now(),
			}

			for i := 0; i < req.GPUs; i++ {
				gpus[i].Allocated = true
				gpus[i].JobID = jobID
				gpus[i].AllocAt = time.Now()
				alloc.GPUIDs[i] = gpus[i].ID
			}

			node.UsedMem += req.MemoryGB
			node.UsedCPUs += req.CPUs

			a.allocations[alloc.ID] = alloc

			// Update quota
			if quota, ok := a.quotas[userID]; ok {
				quota.UsedGPUs += req.GPUs
				quota.UsedMemoryGB += req.MemoryGB
			}

			return alloc, nil
		}
	}

	return nil, errors.New("no suitable node found")
}

// Release frees resources from an allocation.
func (a *GPUAllocator) Release(allocID string) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	alloc, ok := a.allocations[allocID]
	if !ok {
		return errors.New("allocation not found")
	}

	node, ok := a.nodes[alloc.NodeID]
	if !ok {
		return errors.New("node not found")
	}

	// Free GPUs
	for _, gpuID := range alloc.GPUIDs {
		for _, gpu := range node.GPUs {
			if gpu.ID == gpuID {
				gpu.Allocated = false
				gpu.JobID = ""
			}
		}
	}

	node.UsedMem -= alloc.MemoryGB
	node.UsedCPUs -= alloc.CPUs

	delete(a.allocations, allocID)
	return nil
}

// GetClusterStatus returns cluster-wide statistics.
func (a *GPUAllocator) GetClusterStatus() map[string]interface{} {
	a.mu.RLock()
	defer a.mu.RUnlock()

	totalGPUs, usedGPUs := 0, 0
	healthyNodes := 0

	for _, node := range a.nodes {
		if node.Healthy {
			healthyNodes++
		}
		for _, gpu := range node.GPUs {
			totalGPUs++
			if gpu.Allocated {
				usedGPUs++
			}
		}
	}

	utilization := 0.0
	if totalGPUs > 0 {
		utilization = float64(usedGPUs) / float64(totalGPUs) * 100
	}

	return map[string]interface{}{
		"total_nodes":     len(a.nodes),
		"healthy_nodes":   healthyNodes,
		"total_gpus":      totalGPUs,
		"used_gpus":       usedGPUs,
		"gpu_utilization": utilization,
		"allocations":     len(a.allocations),
	}
}

func (a *GPUAllocator) findAvailableGPUs(node *Node, req ResourceRequest) []*GPU {
	var available []*GPU
	for _, gpu := range node.GPUs {
		if !gpu.Allocated {
			if req.GPUType == "" || gpu.Type == req.GPUType {
				available = append(available, gpu)
			}
		}
	}
	return available
}

func generateID() string {
	return time.Now().Format("20060102150405") + "-" + randomString(8)
}

func randomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[time.Now().UnixNano()%int64(len(letters))]
	}
	return string(b)
}
