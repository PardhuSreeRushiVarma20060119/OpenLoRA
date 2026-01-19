// Package api provides HTTP and gRPC APIs for the orchestrator.
package api

import (
	"encoding/json"
	"net/http"

	"openlora/orchestrator/internal/allocator"
	"openlora/orchestrator/internal/scheduler"
)

// HTTPServer provides REST API endpoints.
type HTTPServer struct {
	scheduler *scheduler.Scheduler
	allocator *allocator.GPUAllocator
	mux       *http.ServeMux
}

// NewHTTPServer creates an HTTP server.
func NewHTTPServer(sched *scheduler.Scheduler, alloc *allocator.GPUAllocator) *HTTPServer {
	s := &HTTPServer{
		scheduler: sched,
		allocator: alloc,
		mux:       http.NewServeMux(),
	}
	s.setupRoutes()
	return s
}

func (s *HTTPServer) setupRoutes() {
	s.mux.HandleFunc("/health", s.handleHealth)
	s.mux.HandleFunc("/status", s.handleStatus)
	s.mux.HandleFunc("/jobs", s.handleJobs)
	s.mux.HandleFunc("/jobs/submit", s.handleSubmitJob)
	s.mux.HandleFunc("/nodes", s.handleNodes)
	s.mux.HandleFunc("/nodes/register", s.handleRegisterNode)
}

func (s *HTTPServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *HTTPServer) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func (s *HTTPServer) handleStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	status := s.allocator.GetClusterStatus()
	json.NewEncoder(w).Encode(status)
}

func (s *HTTPServer) handleJobs(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method == http.MethodGet {
		state := scheduler.JobState(r.URL.Query().Get("state"))
		jobs := s.scheduler.ListJobs(state)
		json.NewEncoder(w).Encode(jobs)
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func (s *HTTPServer) handleSubmitJob(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var job scheduler.Job
	if err := json.NewDecoder(r.Body).Decode(&job); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := s.scheduler.Submit(&job); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"job_id": job.ID})
}

func (s *HTTPServer) handleNodes(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	status := s.allocator.GetClusterStatus()
	json.NewEncoder(w).Encode(status)
}

func (s *HTTPServer) handleRegisterNode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var node allocator.Node
	if err := json.NewDecoder(r.Body).Decode(&node); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	s.allocator.RegisterNode(&node)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "registered", "node_id": node.ID})
}
