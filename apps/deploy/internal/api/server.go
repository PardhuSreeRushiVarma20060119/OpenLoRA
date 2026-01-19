// Package api provides HTTP API for deployment service.
package api

import (
	"encoding/json"
	"net/http"

	"openlora/deploy/internal/deployment"
)

// Server is the HTTP API server.
type Server struct {
	manager *deployment.Manager
	mux     *http.ServeMux
}

// NewServer creates an API server.
func NewServer(m *deployment.Manager) *Server {
	srv := &Server{manager: m, mux: http.NewServeMux()}
	srv.setupRoutes()
	return srv
}

func (s *Server) setupRoutes() {
	s.mux.HandleFunc("/health", s.handleHealth)
	s.mux.HandleFunc("/deployments", s.handleDeployments)
	s.mux.HandleFunc("/deployments/", s.handleDeploymentByID)
	s.mux.HandleFunc("/deployments/traffic", s.handleTraffic)
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func (s *Server) handleDeployments(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		env := deployment.Environment(r.URL.Query().Get("env"))
		deployments := s.manager.List(env)
		json.NewEncoder(w).Encode(deployments)

	case http.MethodPost:
		var d deployment.Deployment
		if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := s.manager.Deploy(&d); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(d)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleDeploymentByID(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Path[len("/deployments/"):]
	d, err := s.manager.Get(id)
	if err != nil {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(d)
}

func (s *Server) handleTraffic(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ID         string `json:"id"`
		Percentage int    `json:"percentage"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := s.manager.SetTraffic(req.ID, req.Percentage); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}
