// Package main is the entry point for the Resource Orchestrator service.
// This service manages GPU/TPU allocation, job scheduling, and resource quotas.
package main

import (
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"openlora/orchestrator/internal/allocator"
	"openlora/orchestrator/internal/api"
	"openlora/orchestrator/internal/scheduler"
	pb "openlora/orchestrator/proto"

	"google.golang.org/grpc"
)

func main() {
	log.Println("🚀 OpenLoRA Resource Orchestrator starting...")

	// Initialize components
	alloc := allocator.NewGPUAllocator()
	sched := scheduler.NewScheduler(alloc)
	grpcServer := grpc.NewServer()

	// Register gRPC service
	pb.RegisterOrchestratorServer(grpcServer, api.NewGRPCServer(sched, alloc))

	// Start gRPC server
	grpcPort := getEnv("GRPC_PORT", "50051")
	lis, err := net.Listen("tcp", ":"+grpcPort)
	if err != nil {
		log.Fatalf("Failed to listen: %v", err)
	}

	go func() {
		log.Printf("📡 gRPC server listening on :%s", grpcPort)
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatalf("gRPC server failed: %v", err)
		}
	}()

	// Start HTTP server for REST API
	httpPort := getEnv("HTTP_PORT", "8081")
	httpServer := api.NewHTTPServer(sched, alloc)

	go func() {
		log.Printf("🌐 HTTP server listening on :%s", httpPort)
		if err := http.ListenAndServe(":"+httpPort, httpServer); err != nil {
			log.Fatalf("HTTP server failed: %v", err)
		}
	}()

	// Wait for shutdown signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down...")
	grpcServer.GracefulStop()
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
