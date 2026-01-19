// Package api provides gRPC server for the orchestrator.
package api

import (
	"context"

	"openlora/orchestrator/internal/allocator"
	"openlora/orchestrator/internal/scheduler"
	pb "openlora/orchestrator/proto"
)

// GRPCServer implements the Orchestrator gRPC service.
type GRPCServer struct {
	pb.UnimplementedOrchestratorServer
	scheduler *scheduler.Scheduler
	allocator *allocator.GPUAllocator
}

// NewGRPCServer creates a gRPC server.
func NewGRPCServer(sched *scheduler.Scheduler, alloc *allocator.GPUAllocator) *GRPCServer {
	return &GRPCServer{
		scheduler: sched,
		allocator: alloc,
	}
}

// SubmitJob submits a job for scheduling.
func (s *GRPCServer) SubmitJob(ctx context.Context, req *pb.SubmitJobRequest) (*pb.SubmitJobResponse, error) {
	job := &scheduler.Job{
		Name:     req.Name,
		UserID:   req.UserId,
		Type:     scheduler.JobType(req.Type),
		Priority: int(req.Priority),
		Resources: allocator.ResourceRequest{
			GPUs:     int(req.Resources.Gpus),
			MemoryGB: int(req.Resources.MemoryGb),
			CPUs:     int(req.Resources.Cpus),
		},
	}

	if err := s.scheduler.Submit(job); err != nil {
		return nil, err
	}

	return &pb.SubmitJobResponse{JobId: job.ID}, nil
}

// GetJob retrieves job status.
func (s *GRPCServer) GetJob(ctx context.Context, req *pb.GetJobRequest) (*pb.GetJobResponse, error) {
	job, err := s.scheduler.GetJob(req.JobId)
	if err != nil {
		return nil, err
	}

	return &pb.GetJobResponse{
		JobId:  job.ID,
		State:  string(job.State),
		Name:   job.Name,
		UserId: job.UserID,
	}, nil
}

// CancelJob cancels a job.
func (s *GRPCServer) CancelJob(ctx context.Context, req *pb.CancelJobRequest) (*pb.CancelJobResponse, error) {
	if err := s.scheduler.Cancel(req.JobId); err != nil {
		return &pb.CancelJobResponse{Success: false}, err
	}
	return &pb.CancelJobResponse{Success: true}, nil
}

// GetClusterStatus returns cluster statistics.
func (s *GRPCServer) GetClusterStatus(ctx context.Context, req *pb.ClusterStatusRequest) (*pb.ClusterStatusResponse, error) {
	status := s.allocator.GetClusterStatus()

	return &pb.ClusterStatusResponse{
		TotalNodes:     int32(status["total_nodes"].(int)),
		HealthyNodes:   int32(status["healthy_nodes"].(int)),
		TotalGpus:      int32(status["total_gpus"].(int)),
		UsedGpus:       int32(status["used_gpus"].(int)),
		GpuUtilization: float32(status["gpu_utilization"].(float64)),
	}, nil
}
