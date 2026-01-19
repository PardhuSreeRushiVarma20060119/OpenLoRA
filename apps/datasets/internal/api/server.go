// Package api provides HTTP API for dataset registry.
package api

import (
	"encoding/json"
	"net/http"
	"time"

	"openlora/datasets/internal/store"

	"github.com/google/uuid"
)

// Server is the HTTP API server.
type Server struct {
	store *store.DatasetStore
	mux   *http.ServeMux
}

// NewServer creates an API server.
func NewServer(s *store.DatasetStore) *Server {
	srv := &Server{store: s, mux: http.NewServeMux()}
	srv.setupRoutes()
	return srv
}

func (s *Server) setupRoutes() {
	s.mux.HandleFunc("/health", s.handleHealth)
	s.mux.HandleFunc("/datasets", s.handleDatasets)
	s.mux.HandleFunc("/datasets/", s.handleDatasetByID)
	s.mux.HandleFunc("/versions", s.handleVersions)
	s.mux.HandleFunc("/lineage", s.handleLineage)
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func (s *Server) handleDatasets(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		ownerID := r.URL.Query().Get("owner_id")
		datasets, err := s.store.List(ownerID, 100)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(datasets)

	case http.MethodPost:
		var ds store.Dataset
		if err := json.NewDecoder(r.Body).Decode(&ds); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		ds.ID = uuid.New().String()
		ds.CreatedAt = time.Now()
		ds.UpdatedAt = time.Now()

		if err := s.store.Register(&ds); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(ds)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleDatasetByID(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Path[len("/datasets/"):]
	ds, err := s.store.Get(id)
	if err != nil {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ds)
}

func (s *Server) handleVersions(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		datasetID := r.URL.Query().Get("dataset_id")
		versions, err := s.store.GetVersions(datasetID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(versions)

	case http.MethodPost:
		var v store.DatasetVersion
		if err := json.NewDecoder(r.Body).Decode(&v); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		v.ID = uuid.New().String()
		v.CreatedAt = time.Now()

		if err := s.store.CreateVersion(&v); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(v)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleLineage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	datasetID := r.URL.Query().Get("dataset_id")
	lineage, err := s.store.GetLineage(datasetID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(lineage)
}
