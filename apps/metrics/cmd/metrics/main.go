// Package main is the entry point for the Metrics Aggregator service.
// This service collects and aggregates training metrics and telemetry.
package main

import (
	"log"
	"net/http"
	"os"

	"openlora/metrics/internal/api"
	"openlora/metrics/internal/collector"
)

func main() {
	log.Println("📈 OpenLoRA Metrics Aggregator starting...")

	coll := collector.NewCollector()
	server := api.NewServer(coll)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8085"
	}

	log.Printf("🌐 Listening on :%s", port)
	if err := http.ListenAndServe(":"+port, server); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
