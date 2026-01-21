// Package handlers provides HTTP request handlers for the Core API.
package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"openlora/api/internal/aggregator"
)

// Server is the HTTP API server.
type Server struct {
	agg *aggregator.Aggregator
	mux *http.ServeMux
}

// NewServer creates a new API server.
func NewServer(agg *aggregator.Aggregator) *Server {
	srv := &Server{agg: agg, mux: http.NewServeMux()}
	srv.setupRoutes()
	return srv
}

func (s *Server) setupRoutes() {
	// Core endpoints
	s.mux.HandleFunc("/", s.handleRoot)
	s.mux.HandleFunc("/health", s.handleHealth)
	s.mux.HandleFunc("/status", s.handleStatus)
	s.mux.HandleFunc("/dashboard", s.handleDashboard)

	// Proxy endpoints for direct service access
	s.mux.HandleFunc("/proxy/", s.handleProxy)
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	s.mux.ServeHTTP(w, r)
}

func (s *Server) handleRoot(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"service": "OpenLoRA Core API",
		"version": "0.1.0",
		"endpoints": []string{
			"/health",
			"/status",
			"/dashboard",
			"/proxy/{service}/{path}",
		},
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	status := s.agg.GetSystemStatus()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

func (s *Server) handleDashboard(w http.ResponseWriter, r *http.Request) {
	data, err := s.agg.GetDashboard()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (s *Server) handleProxy(w http.ResponseWriter, r *http.Request) {
	// /proxy/{service}/{path...}
	path := strings.TrimPrefix(r.URL.Path, "/proxy/")
	parts := strings.SplitN(path, "/", 2)
	if len(parts) < 1 {
		http.Error(w, "Invalid proxy path", http.StatusBadRequest)
		return
	}

	service := parts[0]
	subPath := "/"
	if len(parts) == 2 {
		subPath = "/" + parts[1]
	}

	body, err := s.agg.ProxyRequest(service, subPath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
}
