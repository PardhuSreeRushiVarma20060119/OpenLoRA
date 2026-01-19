// Package queue implements the job queue for training jobs.
package queue

import (
	"sync"
	"time"

	"github.com/google/uuid"
)

// JobStatus represents the status of a job.
type JobStatus string

const (
	JobPending   JobStatus = "pending"
	JobRunning   JobStatus = "running"
	JobCompleted JobStatus = "completed"
	JobFailed    JobStatus = "failed"
	JobCancelled JobStatus = "cancelled"
)

// JobPriority represents job priority.
type JobPriority int

const (
	PriorityLow      JobPriority = 0
	PriorityNormal   JobPriority = 1
	PriorityHigh     JobPriority = 2
	PriorityCritical JobPriority = 3
)

// Job represents a training job.
type Job struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Type        string                 `json:"type"` // "lora_train", "rl_train", "eval"
	Status      JobStatus              `json:"status"`
	Priority    JobPriority            `json:"priority"`
	Config      map[string]interface{} `json:"config"`
	Resources   ResourceRequirements   `json:"resources"`
	CreatedAt   time.Time              `json:"created_at"`
	StartedAt   *time.Time             `json:"started_at,omitempty"`
	CompletedAt *time.Time             `json:"completed_at,omitempty"`
	Error       string                 `json:"error,omitempty"`
	WorkerID    string                 `json:"worker_id,omitempty"`
}

// ResourceRequirements specifies resource needs.
type ResourceRequirements struct {
	GPUs     int    `json:"gpus"`
	GPUType  string `json:"gpu_type,omitempty"`
	MemoryGB int    `json:"memory_gb"`
	CPUs     int    `json:"cpus"`
}

// JobQueue manages pending and running jobs.
type JobQueue struct {
	mu        sync.RWMutex
	pending   []*Job
	running   map[string]*Job
	completed map[string]*Job
}

// NewJobQueue creates a new job queue.
func NewJobQueue() *JobQueue {
	return &JobQueue{
		pending:   make([]*Job, 0),
		running:   make(map[string]*Job),
		completed: make(map[string]*Job),
	}
}

// Submit adds a job to the queue.
func (q *JobQueue) Submit(job *Job) string {
	q.mu.Lock()
	defer q.mu.Unlock()

	job.ID = uuid.New().String()
	job.Status = JobPending
	job.CreatedAt = time.Now()

	// Insert by priority
	inserted := false
	for i, existing := range q.pending {
		if job.Priority > existing.Priority {
			q.pending = append(q.pending[:i], append([]*Job{job}, q.pending[i:]...)...)
			inserted = true
			break
		}
	}
	if !inserted {
		q.pending = append(q.pending, job)
	}

	return job.ID
}

// Dequeue gets the next job for a worker.
func (q *JobQueue) Dequeue(workerID string, available ResourceRequirements) *Job {
	q.mu.Lock()
	defer q.mu.Unlock()

	for i, job := range q.pending {
		// Check if worker can handle this job
		if job.Resources.GPUs <= available.GPUs &&
			job.Resources.MemoryGB <= available.MemoryGB {
			// Remove from pending
			q.pending = append(q.pending[:i], q.pending[i+1:]...)

			// Mark as running
			job.Status = JobRunning
			now := time.Now()
			job.StartedAt = &now
			job.WorkerID = workerID

			q.running[job.ID] = job
			return job
		}
	}

	return nil
}

// Complete marks a job as completed.
func (q *JobQueue) Complete(jobID string, err error) {
	q.mu.Lock()
	defer q.mu.Unlock()

	job, ok := q.running[jobID]
	if !ok {
		return
	}

	delete(q.running, jobID)
	now := time.Now()
	job.CompletedAt = &now

	if err != nil {
		job.Status = JobFailed
		job.Error = err.Error()
	} else {
		job.Status = JobCompleted
	}

	q.completed[jobID] = job
}

// Cancel cancels a pending job.
func (q *JobQueue) Cancel(jobID string) bool {
	q.mu.Lock()
	defer q.mu.Unlock()

	// Check pending
	for i, job := range q.pending {
		if job.ID == jobID {
			q.pending = append(q.pending[:i], q.pending[i+1:]...)
			job.Status = JobCancelled
			q.completed[jobID] = job
			return true
		}
	}

	return false
}

// GetJob retrieves a job by ID.
func (q *JobQueue) GetJob(jobID string) *Job {
	q.mu.RLock()
	defer q.mu.RUnlock()

	if job, ok := q.running[jobID]; ok {
		return job
	}
	if job, ok := q.completed[jobID]; ok {
		return job
	}
	for _, job := range q.pending {
		if job.ID == jobID {
			return job
		}
	}

	return nil
}

// Stats returns queue statistics.
func (q *JobQueue) Stats() map[string]int {
	q.mu.RLock()
	defer q.mu.RUnlock()

	return map[string]int{
		"pending":   len(q.pending),
		"running":   len(q.running),
		"completed": len(q.completed),
	}
}
