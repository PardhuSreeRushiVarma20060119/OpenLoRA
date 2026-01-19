// Package store provides database access for datasets.
package store

import (
	"database/sql"
	"encoding/json"
	"time"
)

// Dataset represents a registered dataset.
type Dataset struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description,omitempty"`
	OwnerID     string                 `json:"owner_id"`
	Format      string                 `json:"format"` // jsonl, parquet, csv
	StoragePath string                 `json:"storage_path"`
	Tags        []string               `json:"tags,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// DatasetVersion represents a version of a dataset.
type DatasetVersion struct {
	ID        string    `json:"id"`
	DatasetID string    `json:"dataset_id"`
	Version   int       `json:"version"`
	Checksum  string    `json:"checksum"`
	RowCount  int64     `json:"row_count"`
	SizeBytes int64     `json:"size_bytes"`
	ParentID  string    `json:"parent_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// LineageEntry represents a lineage record.
type LineageEntry struct {
	ID          string    `json:"id"`
	DatasetID   string    `json:"dataset_id"`
	VersionID   string    `json:"version_id"`
	Operation   string    `json:"operation"` // created, filtered, transformed, merged
	SourceIDs   []string  `json:"source_ids,omitempty"`
	Actor       string    `json:"actor"`
	Description string    `json:"description,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

// DatasetStore handles dataset persistence.
type DatasetStore struct {
	db *sql.DB
}

// NewDatasetStore creates a new store.
func NewDatasetStore(db *sql.DB) *DatasetStore {
	return &DatasetStore{db: db}
}

// Register creates a new dataset.
func (s *DatasetStore) Register(ds *Dataset) error {
	tagsJSON, _ := json.Marshal(ds.Tags)
	metaJSON, _ := json.Marshal(ds.Metadata)

	_, err := s.db.Exec(`
		INSERT INTO datasets (id, name, description, owner_id, format, storage_path, tags, metadata, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`, ds.ID, ds.Name, ds.Description, ds.OwnerID, ds.Format, ds.StoragePath, tagsJSON, metaJSON, ds.CreatedAt, ds.UpdatedAt)

	return err
}

// Get retrieves a dataset by ID.
func (s *DatasetStore) Get(id string) (*Dataset, error) {
	ds := &Dataset{}
	var tagsJSON, metaJSON []byte

	err := s.db.QueryRow(`
		SELECT id, name, description, owner_id, format, storage_path, tags, metadata, created_at, updated_at
		FROM datasets WHERE id = $1
	`, id).Scan(&ds.ID, &ds.Name, &ds.Description, &ds.OwnerID, &ds.Format, &ds.StoragePath, &tagsJSON, &metaJSON, &ds.CreatedAt, &ds.UpdatedAt)

	if err != nil {
		return nil, err
	}

	json.Unmarshal(tagsJSON, &ds.Tags)
	json.Unmarshal(metaJSON, &ds.Metadata)

	return ds, nil
}

// List retrieves datasets.
func (s *DatasetStore) List(ownerID string, limit int) ([]*Dataset, error) {
	rows, err := s.db.Query(`
		SELECT id, name, description, owner_id, format, storage_path, tags, metadata, created_at, updated_at
		FROM datasets WHERE owner_id = $1 ORDER BY created_at DESC LIMIT $2
	`, ownerID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var datasets []*Dataset
	for rows.Next() {
		ds := &Dataset{}
		var tagsJSON, metaJSON []byte
		if err := rows.Scan(&ds.ID, &ds.Name, &ds.Description, &ds.OwnerID, &ds.Format, &ds.StoragePath, &tagsJSON, &metaJSON, &ds.CreatedAt, &ds.UpdatedAt); err != nil {
			return nil, err
		}
		json.Unmarshal(tagsJSON, &ds.Tags)
		json.Unmarshal(metaJSON, &ds.Metadata)
		datasets = append(datasets, ds)
	}

	return datasets, nil
}

// CreateVersion creates a new version.
func (s *DatasetStore) CreateVersion(v *DatasetVersion) error {
	_, err := s.db.Exec(`
		INSERT INTO dataset_versions (id, dataset_id, version, checksum, row_count, size_bytes, parent_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, v.ID, v.DatasetID, v.Version, v.Checksum, v.RowCount, v.SizeBytes, v.ParentID, v.CreatedAt)
	return err
}

// GetVersions retrieves all versions of a dataset.
func (s *DatasetStore) GetVersions(datasetID string) ([]*DatasetVersion, error) {
	rows, err := s.db.Query(`
		SELECT id, dataset_id, version, checksum, row_count, size_bytes, parent_id, created_at
		FROM dataset_versions WHERE dataset_id = $1 ORDER BY version DESC
	`, datasetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var versions []*DatasetVersion
	for rows.Next() {
		v := &DatasetVersion{}
		var parentID sql.NullString
		if err := rows.Scan(&v.ID, &v.DatasetID, &v.Version, &v.Checksum, &v.RowCount, &v.SizeBytes, &parentID, &v.CreatedAt); err != nil {
			return nil, err
		}
		if parentID.Valid {
			v.ParentID = parentID.String
		}
		versions = append(versions, v)
	}

	return versions, nil
}

// RecordLineage adds a lineage entry.
func (s *DatasetStore) RecordLineage(entry *LineageEntry) error {
	sourceJSON, _ := json.Marshal(entry.SourceIDs)

	_, err := s.db.Exec(`
		INSERT INTO dataset_lineage (id, dataset_id, version_id, operation, source_ids, actor, description, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, entry.ID, entry.DatasetID, entry.VersionID, entry.Operation, sourceJSON, entry.Actor, entry.Description, entry.CreatedAt)
	return err
}

// GetLineage retrieves lineage for a dataset.
func (s *DatasetStore) GetLineage(datasetID string) ([]*LineageEntry, error) {
	rows, err := s.db.Query(`
		SELECT id, dataset_id, version_id, operation, source_ids, actor, description, created_at
		FROM dataset_lineage WHERE dataset_id = $1 ORDER BY created_at
	`, datasetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []*LineageEntry
	for rows.Next() {
		e := &LineageEntry{}
		var sourceJSON []byte
		if err := rows.Scan(&e.ID, &e.DatasetID, &e.VersionID, &e.Operation, &sourceJSON, &e.Actor, &e.Description, &e.CreatedAt); err != nil {
			return nil, err
		}
		json.Unmarshal(sourceJSON, &e.SourceIDs)
		entries = append(entries, e)
	}

	return entries, nil
}
