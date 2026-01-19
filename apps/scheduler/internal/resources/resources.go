// Package resources manages GPU and compute resources.
package resources

import (
	"sync"
)

// GPU represents a GPU resource.
type GPU struct {
	ID       string `json:"id"`
	Type     string `json:"type"` // "A100", "H100", etc.
	MemoryGB int    `json:"memory_gb"`
	InUse    bool   `json:"in_use"`
	JobID    string `json:"job_id,omitempty"`
}

// Worker represents a training worker node.
type Worker struct {
	ID        string `json:"id"`
	Address   string `json:"address"`
	GPUs      []GPU  `json:"gpus"`
	TotalCPUs int    `json:"total_cpus"`
	UsedCPUs  int    `json:"used_cpus"`
	MemoryGB  int    `json:"memory_gb"`
	UsedMemGB int    `json:"used_memory_gb"`
	Healthy   bool   `json:"healthy"`
}

// ResourceManager tracks cluster resources.
type ResourceManager struct {
	mu      sync.RWMutex
	workers map[string]*Worker
}

// NewResourceManager creates a resource manager.
func NewResourceManager() *ResourceManager {
	return &ResourceManager{
		workers: make(map[string]*Worker),
	}
}

// RegisterWorker adds a worker to the cluster.
func (rm *ResourceManager) RegisterWorker(worker *Worker) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	worker.Healthy = true
	rm.workers[worker.ID] = worker
}

// DeregisterWorker removes a worker.
func (rm *ResourceManager) DeregisterWorker(workerID string) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	delete(rm.workers, workerID)
}

// AllocateGPUs reserves GPUs for a job.
func (rm *ResourceManager) AllocateGPUs(workerID string, numGPUs int, jobID string) ([]string, bool) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	worker, ok := rm.workers[workerID]
	if !ok || !worker.Healthy {
		return nil, false
	}

	allocated := make([]string, 0, numGPUs)
	for i := range worker.GPUs {
		if !worker.GPUs[i].InUse {
			worker.GPUs[i].InUse = true
			worker.GPUs[i].JobID = jobID
			allocated = append(allocated, worker.GPUs[i].ID)
			if len(allocated) == numGPUs {
				break
			}
		}
	}

	if len(allocated) < numGPUs {
		// Rollback
		for _, gpuID := range allocated {
			for i := range worker.GPUs {
				if worker.GPUs[i].ID == gpuID {
					worker.GPUs[i].InUse = false
					worker.GPUs[i].JobID = ""
				}
			}
		}
		return nil, false
	}

	return allocated, true
}

// ReleaseGPUs frees GPUs after job completion.
func (rm *ResourceManager) ReleaseGPUs(workerID string, gpuIDs []string) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	worker, ok := rm.workers[workerID]
	if !ok {
		return
	}

	for _, gpuID := range gpuIDs {
		for i := range worker.GPUs {
			if worker.GPUs[i].ID == gpuID {
				worker.GPUs[i].InUse = false
				worker.GPUs[i].JobID = ""
			}
		}
	}
}

// GetAvailableResources returns available resources per worker.
func (rm *ResourceManager) GetAvailableResources() map[string]AvailableResources {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	result := make(map[string]AvailableResources)
	for id, worker := range rm.workers {
		if !worker.Healthy {
			continue
		}

		freeGPUs := 0
		for _, gpu := range worker.GPUs {
			if !gpu.InUse {
				freeGPUs++
			}
		}

		result[id] = AvailableResources{
			GPUs:     freeGPUs,
			CPUs:     worker.TotalCPUs - worker.UsedCPUs,
			MemoryGB: worker.MemoryGB - worker.UsedMemGB,
		}
	}

	return result
}

// AvailableResources summarizes free resources.
type AvailableResources struct {
	GPUs     int `json:"gpus"`
	CPUs     int `json:"cpus"`
	MemoryGB int `json:"memory_gb"`
}

// ClusterStats returns cluster-wide statistics.
func (rm *ResourceManager) ClusterStats() map[string]interface{} {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	totalGPUs := 0
	usedGPUs := 0
	healthyWorkers := 0

	for _, worker := range rm.workers {
		if worker.Healthy {
			healthyWorkers++
		}
		for _, gpu := range worker.GPUs {
			totalGPUs++
			if gpu.InUse {
				usedGPUs++
			}
		}
	}

	return map[string]interface{}{
		"total_workers":   len(rm.workers),
		"healthy_workers": healthyWorkers,
		"total_gpus":      totalGPUs,
		"used_gpus":       usedGPUs,
		"gpu_utilization": float64(usedGPUs) / float64(totalGPUs+1) * 100,
	}
}
