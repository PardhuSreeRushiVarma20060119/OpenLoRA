// Package main is the entry point for the Experiment Metadata Service.
// This service stores experiment metadata, run history, and comparisons.
package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"

	"openlora/experiments/internal/api"
	"openlora/experiments/internal/store"

	_ "github.com/lib/pq"
)

func main() {
	log.Println("🧪 OpenLoRA Experiment Service starting...")

	// Connect to database
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://localhost:5432/openlora?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize store
	expStore := store.NewExperimentStore(db)

	// HTTP server
	server := api.NewServer(expStore)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	log.Printf("🌐 Listening on :%s", port)
	if err := http.ListenAndServe(":"+port, server); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
