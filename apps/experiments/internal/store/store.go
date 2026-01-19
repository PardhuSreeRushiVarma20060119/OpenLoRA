// Package store provides database access for experiments.
package store

import (
	"database/sql"
	"encoding/json"
	"time"
)

// Experiment represents an experiment group.
type Experiment struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description,omitempty"`
	OwnerID     string                 `json:"owner_id"`
	Tags        []string               `json:"tags,omitempty"`
	Config      map[string]interface{} `json:"config,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// Run represents a single training run.
type Run struct {
	ID           string                 `json:"id"`
	ExperimentID string                 `json:"experiment_id"`
	Name         string                 `json:"name"`
	Status       string                 `json:"status"`
	Hyperparams  map[string]interface{} `json:"hyperparams"`
	Metrics      map[string]float64     `json:"metrics"`
	DatasetID    string                 `json:"dataset_id,omitempty"`
	AdapterID    string                 `json:"adapter_id,omitempty"`
	StartedAt    *time.Time             `json:"started_at,omitempty"`
	CompletedAt  *time.Time             `json:"completed_at,omitempty"`
	CreatedAt    time.Time              `json:"created_at"`
}

// ExperimentStore handles experiment data persistence.
type ExperimentStore struct {
	db *sql.DB
}

// NewExperimentStore creates a new store.
func NewExperimentStore(db *sql.DB) *ExperimentStore {
	return &ExperimentStore{db: db}
}

// CreateExperiment creates a new experiment.
func (s *ExperimentStore) CreateExperiment(exp *Experiment) error {
	configJSON, _ := json.Marshal(exp.Config)
	tagsJSON, _ := json.Marshal(exp.Tags)

	_, err := s.db.Exec(`
		INSERT INTO experiments (id, name, description, owner_id, tags, config, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, exp.ID, exp.Name, exp.Description, exp.OwnerID, tagsJSON, configJSON, exp.CreatedAt, exp.UpdatedAt)

	return err
}

// GetExperiment retrieves an experiment by ID.
func (s *ExperimentStore) GetExperiment(id string) (*Experiment, error) {
	exp := &Experiment{}
	var tagsJSON, configJSON []byte

	err := s.db.QueryRow(`
		SELECT id, name, description, owner_id, tags, config, created_at, updated_at
		FROM experiments WHERE id = $1
	`, id).Scan(&exp.ID, &exp.Name, &exp.Description, &exp.OwnerID, &tagsJSON, &configJSON, &exp.CreatedAt, &exp.UpdatedAt)

	if err != nil {
		return nil, err
	}

	json.Unmarshal(tagsJSON, &exp.Tags)
	json.Unmarshal(configJSON, &exp.Config)

	return exp, nil
}

// ListExperiments retrieves experiments for a user.
func (s *ExperimentStore) ListExperiments(ownerID string, limit, offset int) ([]*Experiment, error) {
	rows, err := s.db.Query(`
		SELECT id, name, description, owner_id, tags, config, created_at, updated_at
		FROM experiments WHERE owner_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, ownerID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var experiments []*Experiment
	for rows.Next() {
		exp := &Experiment{}
		var tagsJSON, configJSON []byte
		if err := rows.Scan(&exp.ID, &exp.Name, &exp.Description, &exp.OwnerID, &tagsJSON, &configJSON, &exp.CreatedAt, &exp.UpdatedAt); err != nil {
			return nil, err
		}
		json.Unmarshal(tagsJSON, &exp.Tags)
		json.Unmarshal(configJSON, &exp.Config)
		experiments = append(experiments, exp)
	}

	return experiments, nil
}

// CreateRun creates a new run.
func (s *ExperimentStore) CreateRun(run *Run) error {
	hyperparamsJSON, _ := json.Marshal(run.Hyperparams)
	metricsJSON, _ := json.Marshal(run.Metrics)

	_, err := s.db.Exec(`
		INSERT INTO runs (id, experiment_id, name, status, hyperparams, metrics, dataset_id, adapter_id, started_at, completed_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`, run.ID, run.ExperimentID, run.Name, run.Status, hyperparamsJSON, metricsJSON, run.DatasetID, run.AdapterID, run.StartedAt, run.CompletedAt, run.CreatedAt)

	return err
}

// GetRun retrieves a run by ID.
func (s *ExperimentStore) GetRun(id string) (*Run, error) {
	run := &Run{}
	var hyperparamsJSON, metricsJSON []byte

	err := s.db.QueryRow(`
		SELECT id, experiment_id, name, status, hyperparams, metrics, dataset_id, adapter_id, started_at, completed_at, created_at
		FROM runs WHERE id = $1
	`, id).Scan(&run.ID, &run.ExperimentID, &run.Name, &run.Status, &hyperparamsJSON, &metricsJSON, &run.DatasetID, &run.AdapterID, &run.StartedAt, &run.CompletedAt, &run.CreatedAt)

	if err != nil {
		return nil, err
	}

	json.Unmarshal(hyperparamsJSON, &run.Hyperparams)
	json.Unmarshal(metricsJSON, &run.Metrics)

	return run, nil
}

// ListRuns retrieves runs for an experiment.
func (s *ExperimentStore) ListRuns(experimentID string) ([]*Run, error) {
	rows, err := s.db.Query(`
		SELECT id, experiment_id, name, status, hyperparams, metrics, dataset_id, adapter_id, started_at, completed_at, created_at
		FROM runs WHERE experiment_id = $1
		ORDER BY created_at DESC
	`, experimentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var runs []*Run
	for rows.Next() {
		run := &Run{}
		var hyperparamsJSON, metricsJSON []byte
		if err := rows.Scan(&run.ID, &run.ExperimentID, &run.Name, &run.Status, &hyperparamsJSON, &metricsJSON, &run.DatasetID, &run.AdapterID, &run.StartedAt, &run.CompletedAt, &run.CreatedAt); err != nil {
			return nil, err
		}
		json.Unmarshal(hyperparamsJSON, &run.Hyperparams)
		json.Unmarshal(metricsJSON, &run.Metrics)
		runs = append(runs, run)
	}

	return runs, nil
}

// CompareRuns compares metrics across multiple runs.
func (s *ExperimentStore) CompareRuns(runIDs []string) (map[string]map[string]float64, error) {
	result := make(map[string]map[string]float64)

	for _, id := range runIDs {
		run, err := s.GetRun(id)
		if err != nil {
			continue
		}
		result[id] = run.Metrics
	}

	return result, nil
}
