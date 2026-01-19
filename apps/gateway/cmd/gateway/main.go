// Package main is the entry point for the API Gateway.
// This service provides a unified entry point with auth and routing.
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
)

// ServiceConfig defines a backend service.
type ServiceConfig struct {
	Name    string `json:"name"`
	Prefix  string `json:"prefix"`
	Backend string `json:"backend"`
}

func main() {
	log.Println("🚪 OpenLoRA API Gateway starting...")

	// Service routes
	services := []ServiceConfig{
		{Name: "orchestrator", Prefix: "/api/v1/orchestrator", Backend: getEnv("ORCHESTRATOR_URL", "http://localhost:8081")},
		{Name: "experiments", Prefix: "/api/v1/experiments", Backend: getEnv("EXPERIMENTS_URL", "http://localhost:8082")},
		{Name: "datasets", Prefix: "/api/v1/datasets", Backend: getEnv("DATASETS_URL", "http://localhost:8083")},
		{Name: "adapters", Prefix: "/api/v1/adapters", Backend: getEnv("ADAPTERS_URL", "http://localhost:8084")},
		{Name: "metrics", Prefix: "/api/v1/metrics", Backend: getEnv("METRICS_URL", "http://localhost:8085")},
		{Name: "deploy", Prefix: "/api/v1/deploy", Backend: getEnv("DEPLOY_URL", "http://localhost:8086")},
		{Name: "marketplace", Prefix: "/api/v1/marketplace", Backend: getEnv("MARKETPLACE_URL", "http://localhost:8087")},
	}

	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]string{"status": "healthy", "service": "gateway"})
	})

	// Service routes
	mux.HandleFunc("/api/v1/services", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(services)
	})

	// Proxy routes
	for _, svc := range services {
		proxy := createProxy(svc.Backend, svc.Prefix)
		mux.Handle(svc.Prefix+"/", authMiddleware(rateLimitMiddleware(proxy)))
		log.Printf("  → %s → %s", svc.Prefix, svc.Backend)
	}

	port := getEnv("PORT", "8080")
	log.Printf("🌐 Gateway listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("Failed: %v", err)
	}
}

func createProxy(backend, prefix string) http.Handler {
	target, _ := url.Parse(backend)

	return &httputil.ReverseProxy{
		Director: func(req *http.Request) {
			req.URL.Scheme = target.Scheme
			req.URL.Host = target.Host
			req.URL.Path = strings.TrimPrefix(req.URL.Path, prefix)
			req.Host = target.Host
		},
	}
}

func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip auth for health checks
		if strings.HasSuffix(r.URL.Path, "/health") {
			next.ServeHTTP(w, r)
			return
		}

		token := r.Header.Get("Authorization")
		if token == "" {
			token = r.URL.Query().Get("token")
		}

		// TODO: Validate token properly
		if token == "" && getEnv("REQUIRE_AUTH", "false") == "true" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func rateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// TODO: Implement rate limiting
		next.ServeHTTP(w, r)
	})
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
