// Package scheduler implements job scheduling and queue management.
package scheduler

import (
	"container/heap"
	"errors"
	"sync"
	"time"

	"openlora/orchestrator/internal/allocator"
)

// JobState represents the lifecycle state of a job.
type JobState string

const (
	JobPending   JobState = "pending"
	JobQueued    JobState = "queued"
	JobAllocated JobState = "allocated"
	JobRunning   JobState = "running"
	JobCompleted JobState = "completed"
	JobFailed    JobState = "failed"
	JobCancelled JobState = "cancelled"
	JobRetrying  JobState = "retrying"
)

// JobType defines the type of job.
type JobType string

const (
	JobLoRATrain JobType = "lora_train"
	JobRLTrain   JobType = "rl_train"
	JobEval      JobType = "eval"
	JobInference JobType = "inference"
)

// Job represents a training/eval job.
type Job struct {
	ID          string                    `json:"id"`
	UserID      string                    `json:"user_id"`
	Name        string                    `json:"name"`
	Type        JobType                   `json:"type"`
	State       JobState                  `json:"state"`
	Priority    int                       `json:"priority"`
	Resources   allocator.ResourceRequest `json:"resources"`
	Config      map[string]interface{}    `json:"config"`
	Allocation  *allocator.Allocation     `json:"allocation,omitempty"`
	RetryCount  int                       `json:"retry_count"`
	MaxRetries  int                       `json:"max_retries"`
	CreatedAt   time.Time                 `json:"created_at"`
	StartedAt   *time.Time                `json:"started_at,omitempty"`
	CompletedAt *time.Time                `json:"completed_at,omitempty"`
	Error       string                    `json:"error,omitempty"`
	index       int                       // heap index
}

// JobQueue is a priority queue for jobs.
type JobQueue []*Job

func (pq JobQueue) Len() int { return len(pq) }

func (pq JobQueue) Less(i, j int) bool {
	return pq[i].Priority > pq[j].Priority
}

func (pq JobQueue) Swap(i, j int) {
	pq[i], pq[j] = pq[j], pq[i]
	pq[i].index = i
	pq[j].index = j
}

func (pq *JobQueue) Push(x interface{}) {
	n := len(*pq)
	job := x.(*Job)
	job.index = n
	*pq = append(*pq, job)
}

func (pq *JobQueue) Pop() interface{} {
	old := *pq
	n := len(old)
	job := old[n-1]
	old[n-1] = nil
	job.index = -1
	*pq = old[0 : n-1]
	return job
}

// Scheduler manages job scheduling and execution.
type Scheduler struct {
	mu        sync.RWMutex
	queue     JobQueue
	jobs      map[string]*Job
	allocator *allocator.GPUAllocator
	stopCh    chan struct{}
}

// NewScheduler creates a new scheduler.
func NewScheduler(alloc *allocator.GPUAllocator) *Scheduler {
	s := &Scheduler{
		queue:     make(JobQueue, 0),
		jobs:      make(map[string]*Job),
		allocator: alloc,
		stopCh:    make(chan struct{}),
	}
	heap.Init(&s.queue)
	go s.runLoop()
	return s
}

// Submit adds a job to the queue.
func (s *Scheduler) Submit(job *Job) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if job.ID == "" {
		job.ID = generateJobID()
	}
	job.State = JobQueued
	job.CreatedAt = time.Now()

	s.jobs[job.ID] = job
	heap.Push(&s.queue, job)

	return nil
}

// Cancel cancels a job.
func (s *Scheduler) Cancel(jobID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	job, ok := s.jobs[jobID]
	if !ok {
		return errors.New("job not found")
	}

	if job.State == JobRunning {
		// Release resources
		if job.Allocation != nil {
			s.allocator.Release(job.Allocation.ID)
		}
	}

	job.State = JobCancelled
	return nil
}

// GetJob retrieves a job by ID.
func (s *Scheduler) GetJob(jobID string) (*Job, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	job, ok := s.jobs[jobID]
	if !ok {
		return nil, errors.New("job not found")
	}
	return job, nil
}

// ListJobs returns all jobs matching a filter.
func (s *Scheduler) ListJobs(state JobState) []*Job {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*Job
	for _, job := range s.jobs {
		if state == "" || job.State == state {
			result = append(result, job)
		}
	}
	return result
}

// CompleteJob marks a job as complete or failed.
func (s *Scheduler) CompleteJob(jobID string, err error) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	job, ok := s.jobs[jobID]
	if !ok {
		return errors.New("job not found")
	}

	now := time.Now()
	job.CompletedAt = &now

	if err != nil {
		if job.RetryCount < job.MaxRetries {
			job.RetryCount++
			job.State = JobRetrying
			heap.Push(&s.queue, job)
			return nil
		}
		job.State = JobFailed
		job.Error = err.Error()
	} else {
		job.State = JobCompleted
	}

	// Release resources
	if job.Allocation != nil {
		s.allocator.Release(job.Allocation.ID)
	}

	return nil
}

func (s *Scheduler) runLoop() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-s.stopCh:
			return
		case <-ticker.C:
			s.trySchedule()
		}
	}
}

func (s *Scheduler) trySchedule() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.queue.Len() == 0 {
		return
	}

	// Try to allocate resources for queued jobs
	for s.queue.Len() > 0 {
		job := heap.Pop(&s.queue).(*Job)

		alloc, err := s.allocator.Allocate(job.ID, job.UserID, job.Resources)
		if err != nil {
			// Re-queue if no resources
			heap.Push(&s.queue, job)
			break
		}

		job.Allocation = alloc
		job.State = JobRunning
		now := time.Now()
		job.StartedAt = &now
	}
}

func (s *Scheduler) Stop() {
	close(s.stopCh)
}

func generateJobID() string {
	return time.Now().Format("20060102150405") + "-job"
}
