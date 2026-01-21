# Multi-stage build for Go services
FROM golang:1.21-alpine AS builder

WORKDIR /app
ARG SERVICE_NAME

# Copy shared modules first (optimization)
# COPY go.work .
# COPY go.work.sum .

# Copy service source
COPY apps/${SERVICE_NAME} ./apps/${SERVICE_NAME}

# Build
WORKDIR /app/apps/${SERVICE_NAME}
RUN go mod download
RUN go build -o /bin/service ./cmd/${SERVICE_NAME}

# Runtime
FROM alpine:latest
COPY --from=builder /bin/service /bin/service
CMD ["/bin/service"]
