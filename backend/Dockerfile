FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    git \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Set environment variables
ENV DJANGO_SETTINGS_MODULE=app.settings

# Set working directory
WORKDIR /dora

# Build args for multi-arch builds
ARG TARGETPLATFORM

# Copy uv configuration files
COPY pyproject.toml uv.lock ./

# Install dependencies using uv
RUN --mount=type=cache,target=/root/.cache/uv,sharing=locked,id=uv-cache-${TARGETPLATFORM:-unknown} \
    uv sync --frozen --no-dev

# Activate the virtual environment for subsequent commands
ENV PATH="/dora/.venv/bin:$PATH"

# Download NLTK data
RUN python -c "import nltk; nltk.download('punkt', quiet=True); nltk.download('punkt_tab', quiet=True)"

# Copy the rest of the application
COPY . .
