// Package api provides HTTP API for marketplace service.
package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"openlora/marketplace/internal/search"
)

// Server is the HTTP API server.
type Server struct {
	engine *search.Engine
	mux    *http.ServeMux
}

// NewServer creates an API server.
func NewServer(e *search.Engine) *Server {
	srv := &Server{engine: e, mux: http.NewServeMux()}
	srv.setupRoutes()
	return srv
}

func (s *Server) setupRoutes() {
	s.mux.HandleFunc("/health", s.handleHealth)
	s.mux.HandleFunc("/search", s.handleSearch)
	s.mux.HandleFunc("/trending", s.handleTrending)
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func (s *Server) handleSearch(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	task := r.URL.Query().Get("task")
	results := s.engine.Search(query, task)
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

func (s *Server) handleTrending(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	limit := 10
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}

	results := s.engine.GetTrending(limit)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}
