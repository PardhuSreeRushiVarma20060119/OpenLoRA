// Package main is the entry point for the OpenHub Marketplace service.
// This service powers adapter discovery, search, and trending feeds.
package main

import (
	"log"
	"net/http"
	"os"

	"openlora/marketplace/internal/api"
	"openlora/marketplace/internal/search"
)

func main() {
	log.Println("🛍️ OpenHub Marketplace Service starting...")

	// Initialize search engine
	searchEngine := search.NewEngine()
	server := api.NewServer(searchEngine)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8087"
	}

	log.Printf("🌐 Listening on :%s", port)
	if err := http.ListenAndServe(":"+port, server); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
