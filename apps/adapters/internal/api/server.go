// Package api provides HTTP API for adapter registry.
package api

import (
	"encoding/json"
	"net/http"
	"time"

	"openlora/adapters/internal/store"

	"github.com/google/uuid"
)

// Server is the HTTP API server.
type Server struct {
	store *store.AdapterStore
	mux   *http.ServeMux
}

// NewServer creates an API server.
func NewServer(s *store.AdapterStore) *Server {
	srv := &Server{store: s, mux: http.NewServeMux()}
	srv.setupRoutes()
	return srv
}

func (s *Server) setupRoutes() {
	s.mux.HandleFunc("/health", s.handleHealth)
	s.mux.HandleFunc("/adapters", s.handleAdapters)
	s.mux.HandleFunc("/adapters/", s.handleAdapterByID)
	s.mux.HandleFunc("/adapters/name/", s.handleAdapterByName)
	s.mux.HandleFunc("/compatible", s.handleCompatible)
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func (s *Server) handleAdapters(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		ownerID := r.URL.Query().Get("owner_id")
		status := store.AdapterStatus(r.URL.Query().Get("status"))
		adapters, err := s.store.List(ownerID, status, 100)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(adapters)

	case http.MethodPost:
		var a store.Adapter
		if err := json.NewDecoder(r.Body).Decode(&a); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		a.ID = uuid.New().String()
		a.Status = store.StatusActive
		a.CreatedAt = time.Now()
		a.UpdatedAt = time.Now()

		if err := s.store.Register(&a); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(a)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleAdapterByID(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Path[len("/adapters/"):]
	if id == "" {
		http.Error(w, "ID required", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		adapter, err := s.store.Get(id)
		if err != nil {
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(adapter)

	case http.MethodPatch:
		var update struct {
			Status store.AdapterStatus `json:"status"`
		}
		if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := s.store.UpdateStatus(id, update.Status); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "updated"})

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleAdapterByName(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Path[len("/adapters/name/"):]
	adapter, err := s.store.GetByName(name)
	if err != nil {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(adapter)
}

func (s *Server) handleCompatible(w http.ResponseWriter, r *http.Request) {
	baseModel := r.URL.Query().Get("base_model")
	adapters, err := s.store.GetCompatible(baseModel)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(adapters)
}
