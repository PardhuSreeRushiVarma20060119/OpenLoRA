// Package api provides HTTP API for experiment service.
package api

import (
	"encoding/json"
	"net/http"
	"time"

	"openlora/experiments/internal/store"

	"github.com/google/uuid"
)

// Server is the HTTP API server.
type Server struct {
	store *store.ExperimentStore
	mux   *http.ServeMux
}

// NewServer creates an API server.
func NewServer(s *store.ExperimentStore) *Server {
	srv := &Server{store: s, mux: http.NewServeMux()}
	srv.setupRoutes()
	return srv
}

func (s *Server) setupRoutes() {
	s.mux.HandleFunc("/health", s.handleHealth)
	s.mux.HandleFunc("/experiments", s.handleExperiments)
	s.mux.HandleFunc("/experiments/", s.handleExperimentByID)
	s.mux.HandleFunc("/runs", s.handleRuns)
	s.mux.HandleFunc("/runs/", s.handleRunByID)
	s.mux.HandleFunc("/compare", s.handleCompare)
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func (s *Server) handleExperiments(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		ownerID := r.URL.Query().Get("owner_id")
		exps, err := s.store.ListExperiments(ownerID, 100, 0)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(exps)

	case http.MethodPost:
		var exp store.Experiment
		if err := json.NewDecoder(r.Body).Decode(&exp); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		exp.ID = uuid.New().String()
		exp.CreatedAt = time.Now()
		exp.UpdatedAt = time.Now()

		if err := s.store.CreateExperiment(&exp); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(exp)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleExperimentByID(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Path[len("/experiments/"):]
	exp, err := s.store.GetExperiment(id)
	if err != nil {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(exp)
}

func (s *Server) handleRuns(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		expID := r.URL.Query().Get("experiment_id")
		runs, err := s.store.ListRuns(expID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(runs)

	case http.MethodPost:
		var run store.Run
		if err := json.NewDecoder(r.Body).Decode(&run); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		run.ID = uuid.New().String()
		run.CreatedAt = time.Now()
		run.Status = "pending"

		if err := s.store.CreateRun(&run); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(run)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleRunByID(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Path[len("/runs/"):]
	run, err := s.store.GetRun(id)
	if err != nil {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(run)
}

func (s *Server) handleCompare(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		RunIDs []string `json:"run_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	result, err := s.store.CompareRuns(req.RunIDs)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
