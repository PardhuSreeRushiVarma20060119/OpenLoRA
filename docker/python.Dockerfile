FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch (CPU version for local dev to save space/time, or CUDA if needed)
# For now, using standard pip which might pull CUDA libs.
# explicitly pointing to cpu to keep image smaller for dev if no GPU passed
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu

# Copy generic requirements if any, or just setup for mounting
# We will rely on volume mounts for development

# Install hatchling for builds
RUN pip install hatchling

# Keep container alive
CMD ["tail", "-f", "/dev/null"]
