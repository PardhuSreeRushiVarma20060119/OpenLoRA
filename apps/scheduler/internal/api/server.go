// Package api provides the HTTP/gRPC API for the scheduler.
package api

import (
	"encoding/json"
	"net/http"

	"openlora/scheduler/internal/queue"
	"openlora/scheduler/internal/resources"
)

// Server is the API server.
type Server struct {
	queue     *queue.JobQueue
	resources *resources.ResourceManager
	mux       *http.ServeMux
}

// NewServer creates an API server.
func NewServer(q *queue.JobQueue, r *resources.ResourceManager) *Server {
	s := &Server{
		queue:     q,
		resources: r,
		mux:       http.NewServeMux(),
	}

	s.setupRoutes()
	return s
}

func (s *Server) setupRoutes() {
	s.mux.HandleFunc("/health", s.handleHealth)
	s.mux.HandleFunc("/jobs", s.handleJobs)
	s.mux.HandleFunc("/jobs/submit", s.handleSubmit)
	s.mux.HandleFunc("/jobs/dequeue", s.handleDequeue)
	s.mux.HandleFunc("/workers", s.handleWorkers)
	s.mux.HandleFunc("/workers/register", s.handleRegisterWorker)
	s.mux.HandleFunc("/stats", s.handleStats)
}

// Start starts the HTTP server.
func (s *Server) Start(addr string) error {
	return http.ListenAndServe(addr, s.mux)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func (s *Server) handleJobs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	jobID := r.URL.Query().Get("id")
	if jobID != "" {
		job := s.queue.GetJob(jobID)
		if job == nil {
			http.Error(w, "Job not found", http.StatusNotFound)
			return
		}
		json.NewEncoder(w).Encode(job)
		return
	}

	json.NewEncoder(w).Encode(s.queue.Stats())
}

func (s *Server) handleSubmit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var job queue.Job
	if err := json.NewDecoder(r.Body).Decode(&job); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	jobID := s.queue.Submit(&job)
	json.NewEncoder(w).Encode(map[string]string{"job_id": jobID})
}

func (s *Server) handleDequeue(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		WorkerID  string                     `json:"worker_id"`
		Available queue.ResourceRequirements `json:"available"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	job := s.queue.Dequeue(req.WorkerID, req.Available)
	if job == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"job": nil})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"job": job})
}

func (s *Server) handleWorkers(w http.ResponseWriter, r *http.Request) {
	available := s.resources.GetAvailableResources()
	json.NewEncoder(w).Encode(available)
}

func (s *Server) handleRegisterWorker(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var worker resources.Worker
	if err := json.NewDecoder(r.Body).Decode(&worker); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	s.resources.RegisterWorker(&worker)
	json.NewEncoder(w).Encode(map[string]string{"status": "registered"})
}

func (s *Server) handleStats(w http.ResponseWriter, r *http.Request) {
	stats := map[string]interface{}{
		"jobs":    s.queue.Stats(),
		"cluster": s.resources.ClusterStats(),
	}
	json.NewEncoder(w).Encode(stats)
}
