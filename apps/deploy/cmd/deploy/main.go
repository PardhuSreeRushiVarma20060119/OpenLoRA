// Package main is the entry point for the OpenDeploy service.
// This service manages inference deployments, traffic splitting, and rollbacks.
package main

import (
	"log"
	"net/http"
	"os"

	"openlora/deploy/internal/api"
	"openlora/deploy/internal/deployment"
)

func main() {
	log.Println("🚀 OpenDeploy Deployment Control Plane starting...")

	// Initialize deployment manager
	deployMgr := deployment.NewManager()
	server := api.NewServer(deployMgr)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8086"
	}

	log.Printf("🌐 Listening on :%s", port)
	if err := http.ListenAndServe(":"+port, server); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
