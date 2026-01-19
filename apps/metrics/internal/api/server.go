// Package api provides HTTP API for metrics service.
package api

import (
	"encoding/json"
	"net/http"

	"openlora/metrics/internal/collector"
)

// Server is the HTTP API server.
type Server struct {
	collector *collector.Collector
	mux       *http.ServeMux
}

// NewServer creates an API server.
func NewServer(c *collector.Collector) *Server {
	srv := &Server{collector: c, mux: http.NewServeMux()}
	srv.setupRoutes()
	return srv
}

func (s *Server) setupRoutes() {
	s.mux.HandleFunc("/health", s.handleHealth)
	s.mux.HandleFunc("/metrics", s.handleMetrics)
	s.mux.HandleFunc("/metrics/push", s.handlePush)
	s.mux.HandleFunc("/metrics/prometheus", s.handlePrometheus)
	s.mux.HandleFunc("/recent", s.handleRecent)
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func (s *Server) handleMetrics(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	w.Header().Set("Content-Type", "application/json")

	if name != "" {
		m := s.collector.GetMetric(name)
		if m == nil {
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
		json.NewEncoder(w).Encode(m)
		return
	}

	json.NewEncoder(w).Encode(s.collector.GetAllMetrics())
}

func (s *Server) handlePush(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var batch collector.MetricBatch
	if err := json.NewDecoder(r.Body).Decode(&batch); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	s.collector.Push(batch)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (s *Server) handlePrometheus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	w.Write([]byte(s.collector.PrometheusExport()))
}

func (s *Server) handleRecent(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s.collector.GetRecentBatches(100))
}
