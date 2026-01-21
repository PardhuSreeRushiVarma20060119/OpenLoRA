// Package main is the entry point for the OpenUniversity service.
// This service manages courses, modules, and user progress.
package main

import (
	"log"
	"net/http"
	"os"

	"openlora/university/internal/api"
	"openlora/university/internal/courses"
)

func main() {
	log.Println("🎓 OpenUniversity Service starting...")

	// Initialize course manager
	courseMgr := courses.NewManager()
	server := api.NewServer(courseMgr)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8088"
	}

	log.Printf("🌐 Listening on :%s", port)
	if err := http.ListenAndServe(":"+port, server); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
