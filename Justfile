# OpenLoRA Justfile

set shell := ["powershell.exe", "-c"]

# Build everything
build: build-rust build-go build-studio
    echo "✅ All components built"

# Build Rust Governance
build-rust:
    echo "🦀 Building Rust Governance..."
    cd packages/core-rust && cargo build --release
    cd apps/governance && cargo build --release

# Build Go Microservices
build-go:
    echo "🔵 Building Go Services..."
    cd apps/gateway && go build ./...
    cd apps/orchestrator && go build ./...
    cd apps/experiments && go build ./...
    cd apps/datasets && go build ./...
    cd apps/adapters && go build ./...
    cd apps/metrics && go build ./...
    cd apps/deploy && go build ./...
    cd apps/marketplace && go build ./...
    cd apps/university && go build ./...

# Build Studio
build-studio:
    echo "⚛️ Installing Studio dependencies..."
    cd apps/studio && npm install
    echo "⚛️ Building Studio..."
    cd apps/studio && npm run build

# Run all services (dev mode)
up:
    docker-compose up --build -d

# Stop all services
down:
    docker-compose down

# Run Rust tests
test-rust:
    cd packages/core-rust && cargo test
    cd apps/governance && cargo test

# Run Go tests
test-go:
    cd apps/orchestrator && go test ./...
    cd apps/experiments && go test ./...

# Governance CLI alias
gov *args:
    cargo run --manifest-path apps/governance/Cargo.toml -- {{args}}
