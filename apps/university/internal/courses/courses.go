// Package courses manages educational content and user progress.
package courses

import (
	"errors"
	"sync"
	"time"
)

// Course represents an educational course.
type Course struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Level       string    `json:"level"` // Beginner, Intermediate, Advanced
	Modules     []Module  `json:"modules"`
	Tags        []string  `json:"tags"`
	CreatedAt   time.Time `json:"created_at"`
}

// Module represents a section of a course.
type Module struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Content  string `json:"content_url"`      // Link to markdown/video
	LabID    string `json:"lab_id,omitempty"` // Link to interactive lab
	Duration int    `json:"duration_min"`
}

// Enrollment tracks a user's progress in a course.
type Enrollment struct {
	UserID        string            `json:"user_id"`
	CourseID      string            `json:"course_id"`
	Progress      float64           `json:"progress"` // 0-100
	CompletedMods []string          `json:"completed_modules"`
	LabStatus     map[string]string `json:"lab_status"` // lab_id -> status
	StartedAt     time.Time         `json:"started_at"`
	LastActiveAt  time.Time         `json:"last_active_at"`
}

// Manager handles course logic.
type Manager struct {
	mu          sync.RWMutex
	courses     map[string]*Course
	enrollments map[string]*Enrollment // Key: userID:courseID
}

// NewManager creates a new course manager.
func NewManager() *Manager {
	m := &Manager{
		courses:     make(map[string]*Course),
		enrollments: make(map[string]*Enrollment),
	}
	m.seedCourses()
	return m
}

// ListCourses returns all available courses.
func (m *Manager) ListCourses() []*Course {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var list []*Course
	for _, c := range m.courses {
		list = append(list, c)
	}
	return list
}

// GetCourse retrieves a course by ID.
func (m *Manager) GetCourse(id string) (*Course, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if c, ok := m.courses[id]; ok {
		return c, nil
	}
	return nil, errors.New("course not found")
}

// Enroll signs a user up for a course.
func (m *Manager) Enroll(userID, courseID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.courses[courseID]; !ok {
		return errors.New("course not found")
	}

	key := userID + ":" + courseID
	if _, exists := m.enrollments[key]; exists {
		return errors.New("already enrolled")
	}

	m.enrollments[key] = &Enrollment{
		UserID:       userID,
		CourseID:     courseID,
		Progress:     0,
		StartedAt:    time.Now(),
		LastActiveAt: time.Now(),
		LabStatus:    make(map[string]string),
	}

	return nil
}

// UpdateProgress updates module completion status.
func (m *Manager) UpdateProgress(userID, courseID, moduleID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	key := userID + ":" + courseID
	enrollment, ok := m.enrollments[key]
	if !ok {
		return errors.New("not enrolled")
	}

	// Check if module exists in course
	course := m.courses[courseID]
	validModule := false
	for _, mod := range course.Modules {
		if mod.ID == moduleID {
			validModule = true
			break
		}
	}
	if !validModule {
		return errors.New("module not found")
	}

	// Add to completed if not already
	alreadyCompleted := false
	for _, id := range enrollment.CompletedMods {
		if id == moduleID {
			alreadyCompleted = true
			break
		}
	}

	if !alreadyCompleted {
		enrollment.CompletedMods = append(enrollment.CompletedMods, moduleID)
		enrollment.Progress = float64(len(enrollment.CompletedMods)) / float64(len(course.Modules)) * 100.0
	}
	enrollment.LastActiveAt = time.Now()

	return nil
}

// GetEnrollment retrieves user progress.
func (m *Manager) GetEnrollment(userID, courseID string) (*Enrollment, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	key := userID + ":" + courseID
	if e, ok := m.enrollments[key]; ok {
		return e, nil
	}
	return nil, errors.New("enrollment not found")
}

func (m *Manager) seedCourses() {
	m.courses["lora-101"] = &Course{
		ID: "lora-101", Title: "LoRA Fundamentals", Description: "Introduction to Low-Rank Adaptation.",
		Level: "Beginner", Tags: []string{"theory", "basics"}, CreatedAt: time.Now(),
		Modules: []Module{
			{ID: "m1", Title: "What is LoRA?", Duration: 15},
			{ID: "m2", Title: "Matrix Decomposition", Duration: 30},
			{ID: "m3", Title: "First Fine-tune", LabID: "lab-BasicTune", Duration: 60},
		},
	}
	m.courses["ops-201"] = &Course{
		ID: "ops-201", Title: "Operational AI", Description: "Managing LoRA at scale.",
		Level: "Intermediate", Tags: []string{"devops", "production"}, CreatedAt: time.Now(),
		Modules: []Module{
			{ID: "m1", Title: "Adapter Registries", Duration: 20},
			{ID: "m2", Title: "Canary Deployments", LabID: "lab-Canary", Duration: 45},
		},
	}
}
