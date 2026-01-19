// Package main is the entry point for the Adapter Registry Service.
// This service manages LoRA adapter registration, versioning, and compatibility.
package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"

	"openlora/adapters/internal/api"
	"openlora/adapters/internal/store"

	_ "github.com/lib/pq"
)

func main() {
	log.Println("🔌 OpenLoRA Adapter Registry starting...")

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://localhost:5432/openlora?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	adapterStore := store.NewAdapterStore(db)
	server := api.NewServer(adapterStore)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8084"
	}

	log.Printf("🌐 Listening on :%s", port)
	if err := http.ListenAndServe(":"+port, server); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
