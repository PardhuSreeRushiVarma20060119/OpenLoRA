// Package main is the entry point for the Dataset Registry Service.
// This service manages dataset registration, versioning, and lineage.
package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"

	"openlora/datasets/internal/api"
	"openlora/datasets/internal/store"

	_ "github.com/lib/pq"
)

func main() {
	log.Println("📊 OpenLoRA Dataset Registry starting...")

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://localhost:5432/openlora?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	datasetStore := store.NewDatasetStore(db)
	server := api.NewServer(datasetStore)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}

	log.Printf("🌐 Listening on :%s", port)
	if err := http.ListenAndServe(":"+port, server); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
