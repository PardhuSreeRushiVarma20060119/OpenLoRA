// Package main is the entry point for the OpenLoRA Core API.
// This service acts as a unified aggregator providing a single
// API surface for the entire OpenLoRA platform.
package main

import (
	"log"
	"net/http"
	"os"

	"openlora/api/internal/aggregator"
	"openlora/api/internal/handlers"
)

func main() {
	log.Println("🌐 OpenLoRA Core API starting...")

	// Initialize aggregator with service endpoints
	agg := aggregator.New(aggregator.Config{
		OrchestratorURL: getEnv("ORCHESTRATOR_URL", "http://localhost:8081"),
		ExperimentsURL:  getEnv("EXPERIMENTS_URL", "http://localhost:8082"),
		DatasetsURL:     getEnv("DATASETS_URL", "http://localhost:8083"),
		AdaptersURL:     getEnv("ADAPTERS_URL", "http://localhost:8084"),
		MetricsURL:      getEnv("METRICS_URL", "http://localhost:8085"),
		DeployURL:       getEnv("DEPLOY_URL", "http://localhost:8086"),
		MarketplaceURL:  getEnv("MARKETPLACE_URL", "http://localhost:8087"),
		UniversityURL:   getEnv("UNIVERSITY_URL", "http://localhost:8088"),
	})

	server := handlers.NewServer(agg)

	port := getEnv("PORT", "8090")
	log.Printf("🚀 Core API listening on :%s", port)
	if err := http.ListenAndServe(":"+port, server); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
