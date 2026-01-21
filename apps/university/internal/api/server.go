// Package api provides HTTP API for university service.
package api

import (
	"encoding/json"
	"net/http"

	"openlora/university/internal/courses"
)

// Server is the HTTP API server.
type Server struct {
	manager *courses.Manager
	mux     *http.ServeMux
}

// NewServer creates an API server.
func NewServer(m *courses.Manager) *Server {
	srv := &Server{manager: m, mux: http.NewServeMux()}
	srv.setupRoutes()
	return srv
}

func (s *Server) setupRoutes() {
	s.mux.HandleFunc("/health", s.handleHealth)
	s.mux.HandleFunc("/courses", s.handleCourses)
	s.mux.HandleFunc("/courses/", s.handleCourseByID)
	s.mux.HandleFunc("/enroll", s.handleEnroll)
	s.mux.HandleFunc("/progress", s.handleProgress)
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func (s *Server) handleCourses(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	list := s.manager.ListCourses()
	json.NewEncoder(w).Encode(list)
}

func (s *Server) handleCourseByID(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Path[len("/courses/"):]
	c, err := s.manager.GetCourse(id)
	if err != nil {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(c)
}

func (s *Server) handleEnroll(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		UserID   string `json:"user_id"`
		CourseID string `json:"course_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := s.manager.Enroll(req.UserID, req.CourseID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest) // Simple error handling
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "enrolled"})
}

func (s *Server) handleProgress(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		UserID   string `json:"user_id"`
		CourseID string `json:"course_id"`
		ModuleID string `json:"module_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := s.manager.UpdateProgress(req.UserID, req.CourseID, req.ModuleID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	status, _ := s.manager.GetEnrollment(req.UserID, req.CourseID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}
