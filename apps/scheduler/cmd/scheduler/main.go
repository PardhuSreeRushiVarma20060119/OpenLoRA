// Package scheduler implements the OpenLoRA Job Scheduler.
// Tier 2: Go for control plane and orchestration.
package main

import (
	"log"
	"os"

	"openlora/scheduler/internal/api"
	"openlora/scheduler/internal/queue"
	"openlora/scheduler/internal/resources"
)

func main() {
	log.Println("🚀 OpenLoRA Scheduler starting...")

	// Initialize components
	jobQueue := queue.NewJobQueue()
	resourceMgr := resources.NewResourceManager()
	server := api.NewServer(jobQueue, resourceMgr)

	// Get port from env or default
	port := os.Getenv("SCHEDULER_PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("📡 Listening on :%s", port)
	if err := server.Start(":" + port); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
