// Package store provides database access for adapters.
package store

import (
	"database/sql"
	"encoding/json"
	"time"
)

// AdapterStatus represents adapter lifecycle state.
type AdapterStatus string

const (
	StatusActive      AdapterStatus = "active"
	StatusTraining    AdapterStatus = "training"
	StatusQuarantined AdapterStatus = "quarantined"
	StatusArchived    AdapterStatus = "archived"
	StatusDestroyed   AdapterStatus = "destroyed"
)

// Adapter represents a LoRA adapter.
type Adapter struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Version     int                    `json:"version"`
	BaseModel   string                 `json:"base_model"`
	Status      AdapterStatus          `json:"status"`
	Task        string                 `json:"task"` // CAUSAL_LM, SEQ_CLS, etc.
	OwnerID     string                 `json:"owner_id"`
	StoragePath string                 `json:"storage_path"`
	Checksum    string                 `json:"checksum"`
	Config      map[string]interface{} `json:"config"`
	Metrics     map[string]float64     `json:"metrics,omitempty"`
	Tags        []string               `json:"tags,omitempty"`
	ParentID    string                 `json:"parent_id,omitempty"`
	SignatureID string                 `json:"signature_id,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// Dependency represents an adapter dependency.
type Dependency struct {
	AdapterID      string `json:"adapter_id"`
	DependsOnID    string `json:"depends_on_id"`
	DependencyType string `json:"dependency_type"` // requires, extends, conflicts
}

// AdapterStore handles adapter persistence.
type AdapterStore struct {
	db *sql.DB
}

// NewAdapterStore creates a new store.
func NewAdapterStore(db *sql.DB) *AdapterStore {
	return &AdapterStore{db: db}
}

// Register creates a new adapter.
func (s *AdapterStore) Register(a *Adapter) error {
	configJSON, _ := json.Marshal(a.Config)
	metricsJSON, _ := json.Marshal(a.Metrics)
	tagsJSON, _ := json.Marshal(a.Tags)

	_, err := s.db.Exec(`
		INSERT INTO adapters (id, name, version, base_model, status, task, owner_id, storage_path, checksum, config, metrics, tags, parent_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`, a.ID, a.Name, a.Version, a.BaseModel, a.Status, a.Task, a.OwnerID, a.StoragePath, a.Checksum, configJSON, metricsJSON, tagsJSON, a.ParentID, a.CreatedAt, a.UpdatedAt)

	return err
}

// Get retrieves an adapter by ID.
func (s *AdapterStore) Get(id string) (*Adapter, error) {
	a := &Adapter{}
	var configJSON, metricsJSON, tagsJSON []byte
	var parentID sql.NullString

	err := s.db.QueryRow(`
		SELECT id, name, version, base_model, status, task, owner_id, storage_path, checksum, config, metrics, tags, parent_id, created_at, updated_at
		FROM adapters WHERE id = $1
	`, id).Scan(&a.ID, &a.Name, &a.Version, &a.BaseModel, &a.Status, &a.Task, &a.OwnerID, &a.StoragePath, &a.Checksum, &configJSON, &metricsJSON, &tagsJSON, &parentID, &a.CreatedAt, &a.UpdatedAt)

	if err != nil {
		return nil, err
	}

	json.Unmarshal(configJSON, &a.Config)
	json.Unmarshal(metricsJSON, &a.Metrics)
	json.Unmarshal(tagsJSON, &a.Tags)
	if parentID.Valid {
		a.ParentID = parentID.String
	}

	return a, nil
}

// GetByName retrieves latest version by name.
func (s *AdapterStore) GetByName(name string) (*Adapter, error) {
	a := &Adapter{}
	var configJSON, metricsJSON, tagsJSON []byte
	var parentID sql.NullString

	err := s.db.QueryRow(`
		SELECT id, name, version, base_model, status, task, owner_id, storage_path, checksum, config, metrics, tags, parent_id, created_at, updated_at
		FROM adapters WHERE name = $1 ORDER BY version DESC LIMIT 1
	`, name).Scan(&a.ID, &a.Name, &a.Version, &a.BaseModel, &a.Status, &a.Task, &a.OwnerID, &a.StoragePath, &a.Checksum, &configJSON, &metricsJSON, &tagsJSON, &parentID, &a.CreatedAt, &a.UpdatedAt)

	if err != nil {
		return nil, err
	}

	json.Unmarshal(configJSON, &a.Config)
	json.Unmarshal(metricsJSON, &a.Metrics)
	json.Unmarshal(tagsJSON, &a.Tags)
	if parentID.Valid {
		a.ParentID = parentID.String
	}

	return a, nil
}

// List retrieves adapters with filters.
func (s *AdapterStore) List(ownerID string, status AdapterStatus, limit int) ([]*Adapter, error) {
	query := `SELECT id, name, version, base_model, status, task, owner_id, storage_path, checksum, config, metrics, tags, parent_id, created_at, updated_at FROM adapters WHERE 1=1`
	args := []interface{}{}
	argIdx := 1

	if ownerID != "" {
		query += ` AND owner_id = $` + string(rune('0'+argIdx))
		args = append(args, ownerID)
		argIdx++
	}
	if status != "" {
		query += ` AND status = $` + string(rune('0'+argIdx))
		args = append(args, status)
		argIdx++
	}
	query += ` ORDER BY created_at DESC LIMIT $` + string(rune('0'+argIdx))
	args = append(args, limit)

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var adapters []*Adapter
	for rows.Next() {
		a := &Adapter{}
		var configJSON, metricsJSON, tagsJSON []byte
		var parentID sql.NullString
		if err := rows.Scan(&a.ID, &a.Name, &a.Version, &a.BaseModel, &a.Status, &a.Task, &a.OwnerID, &a.StoragePath, &a.Checksum, &configJSON, &metricsJSON, &tagsJSON, &parentID, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		json.Unmarshal(configJSON, &a.Config)
		json.Unmarshal(metricsJSON, &a.Metrics)
		json.Unmarshal(tagsJSON, &a.Tags)
		if parentID.Valid {
			a.ParentID = parentID.String
		}
		adapters = append(adapters, a)
	}

	return adapters, nil
}

// UpdateStatus updates adapter status.
func (s *AdapterStore) UpdateStatus(id string, status AdapterStatus) error {
	_, err := s.db.Exec(`UPDATE adapters SET status = $1, updated_at = $2 WHERE id = $3`, status, time.Now(), id)
	return err
}

// GetCompatible finds adapters compatible with a base model.
func (s *AdapterStore) GetCompatible(baseModel string) ([]*Adapter, error) {
	return s.List("", StatusActive, 100) // Simplified - filter by base_model in production
}
