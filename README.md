# DORA

[![Documentation](https://img.shields.io/badge/docs-insilicomedicine.github.io-blue)](https://insilicomedicine.github.io/poml/)
[![Test Status](https://github.com/insilicomedicine/DORA/actions/workflows/ci-frontend.yml/badge.svg)](https://github.com/insilicomedicine/DORA/actions/workflows/ci-frontend.yml)
[![Test Status](https://github.com/insilicomedicine/DORA/actions/workflows/ci-backend.yml/badge.svg)](https://github.com/insilicomedicine/DORA/actions/workflows/ci-backend.yml)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%20License%202.0-blue)](https://opensource.org/license/apache-2-0)

**DORA (Draft Outline Research Assistant)** is an advanced AI-driven tool designed to streamline the process of drafting academic papers and other related documents.

<img src='docs/assets/2025_DORA_main_video.gif'>

## Quick Start

### System requirements
- CPU: 4 cores
- RAM: 8 GB
- Storage: 20 GB
- Network: High-speed internet for API calls

### Pre-requests
The easiest way to start the DORA services is through Docker Compose. Please make sure that [Docker](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/) are installed on your machine.


### Instructions
1. Clone the repository:
   ```bash
   git clone git@github.com:insilicomedicine/DORA.git
   ```

2. Navigate to the DORA directory:
   ```bash
   cd DORA/
   ```

3. Copy the environment configuration file:
   ```bash
   cp backend/.env.example backend/.env
   ```

4. Configure the required settings in `backend/.env`:

   DORA uses a BYOK (Bring Your Own Key) approach, meaning you need to provide your own API keys for AI services. Edit the `backend/.env` file with your API credentials:

   - `OPENAI_API_KEY` - Your OpenAI API key (essential for document generation and all LLM-related features)

   - `EMBEDDING_OPENAI_API_CONFIGS` - Needed for Custom bibliography and Web search functionality

   Choose your AI provider:
   
   - Option A: Using OpenAI directly
      ```bash
      OPENAI_API_TYPE=openai
      OPENAI_API_KEY=<your_openai_api_key>

      EMBEDDING_OPENAI_API_CONFIGS=[{"model": "text-embedding-3-small", "api_key": "<your_openai_api_key>"}]
      ```

   - Option B: Using Azure OpenAI
      ```bash
      OPENAI_API_TYPE=azure
      OPENAI_API_BASE_URL=https://<your_base_url>.openai.azure.com/
      OPENAI_API_VERSION=2024-10-21
      OPENAI_API_DEPLOYMENT_NAME=<your_deployment>
      OPENAI_API_KEY=<your_azure_openai_key>

      EMBEDDING_OPENAI_API_CONFIGS=[{"model": "text-embedding-3-small", "base_url": "https://<your_base_url>.openai.azure.com", "version": "2023-05-15", "deployment_name": "<your_deployment>", "api_key": "<your_api_key>"}]
      ```

   - Option C: Using another openai-compatible LLM deployment (self-hosted or third-party)
      ```bash
      OPENAI_API_TYPE=openai
      OPENAI_API_BASE_URL=https://<your-private-llm-endpoint>
      OPENAI_API_KEY=<your_private_api_key>
      # Additional settings may be required depending on your deployment
      # OPENAI_API_VERSION=<your_api_version> (if needed)
      # OPENAI_API_DEPLOYMENT_NAME=<your_model_name> (if needed)

      EMBEDDING_OPENAI_API_CONFIGS=[{"model": "text-embedding-3-small", "base_url": "https://<your-private-llm-endpoint>", "version": "<your_api_version>", "deployment_name": "<your_deployment>", "api_key": "<your_api_key>"}]
      ```

   > 💡 **New to AI APIs?** You can get an OpenAI API key at [platform.openai.com](https://platform.openai.com/api-keys). The free tier is sufficient for testing DORA's capabilities.

5. You can use the example [docker-compose.yml](./docker-compose.yml), and modify it based on your own requirements. Start the services using Docker Compose:
   ```bash
   docker compose up -d
   ```

6. Wait for the backend to be ready (usually within 30 seconds):
   ```bash
   docker logs -f dora_backend
   ```
   Press `Ctrl+C` when the backend is ready.

7. Load initial data:
   Initial data needs to be populated to the database, including sample account, templates, prompts, documents, etc. Run this command to load the data. This step is only necessary when you start the services for the first time.
   ```bash
   docker compose exec dora_backend python manage.py loaddata initial_data.json
   ```

8. Open your browser and navigate to:
   ```
   http://localhost
   ```

9.  Login with the default credentials:
   - Username: `dora@test.com`
   - Password: `dora`
   - Alternatively, you can create your own admin user:
        ```bash
        docker compose exec dora_backend python manage.py createsuperuser
        ```

10. You can configure the templates, tools, users, etc. using Django Admin Panel at:
    ```
    http://localhost/admin
    ```

For more detailed instructions about how to generate a document, or configure the templates, please refer to the [User Manual](https://insilicomedicine.github.io/DORA/).

## Building Images Locally for Development

If you need to modify the code and build the images locally instead of using the pre-built images, follow these steps:

### Building the Frontend Image

The frontend uses a two-stage build process with a base image containing dependencies:

1. **Build the base image** (contains Node.js, nginx, pnpm, and dependencies):
   ```bash
   docker build -f frontend/Base.Dockerfile -t dora-frontend-base:local frontend/
   ```

2. **Build the frontend application image**:
   ```bash
   docker build --build-arg BASE_IMAGE=dora-frontend-base:local \
                -t dora-frontend:local frontend/
   ```

3. **Update docker-compose.yml** to use your local image:
   ```yaml
   frontend:
     image: dora-frontend:local
     # ... rest of the configuration
   ```

### Building the Backend Image

1. **Build the backend image**:
   ```bash
   docker build -t dora-backend:local backend/
   ```

2. **Update docker-compose.yml** to use your local images:
   ```yaml
   dora_backend:
     image: dora-backend:local
     # ... rest of the configuration
   
   dora_worker:
     image: dora-backend:local
     # ... rest of the configuration
   
   dora_backend_ws:
     image: dora-backend:local
     # ... rest of the configuration
   ```

### Build Arguments for Frontend

You can customize the frontend build with these arguments:

- `BASE_IMAGE`: The base image to use (should be `dora-frontend-base:local` for local builds)
- `GENERATE_SOURCEMAP`: Set to `true` to generate source maps for debugging
- `VITE_ENVIRONMENT`: Set to `development` or `production`
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth client ID (optional)
- `VITE_SENTRY_DSN`: Sentry DSN for error tracking (optional)
- `SENTRY_AUTH_TOKEN`: Sentry auth token for uploading source maps (optional)
- `VITE_GA_MEASUREMENT_ID`: Google Analytics measurement ID (optional)
- `VITE_JIRA_WIDGET_KEY`: Jira service desk key (optional)

After building the images locally, make sure to update the `image:` references in your `docker-compose.yml` file to point to your local images instead of the pre-built ones.

## Feature comparisons in different DORA Editions

| Feature                                                       | **OPEN** <br> DORA FREE Community Edition | **BASIC** <br> [DORA SaaS Edition](http://pharma.ai/dora) | **ULTIMATE** <br> DORA Enterprise Edition |
|---------------------------------------------------------------|:-----------:|:-----------:|:---------:|
| Use your own LLM API keys                                     | ✓           | ✗          | ✓         |
| Generate documents                                            | ✓           | ✓          | ✓         |
| Pre-built basic templates included                            | ✓           | ✓          | ✓         |
| Web search with DuckDuckGo or Serper API                      | ✓ *         | ✓          | ✓         |
| Use your custom tools & templates                             | ✓           | ✓          | ✓         |
| AI review                                                     | ✓           | ✓          | ✓         |
| Add citations & find references via web search                | ✓           | ✓          | ✓         |
| AI-powered text editing                                       | ✓           | ✓          | ✓         |
| Visual summary                                                | ✓           | ✓          | ✓         |
| Export documents to .docx and PDF files                       | ✓           | ✓          | ✓         |
| Precious3GPT integration                                      | ✓ **        | ✓          | ✓         |
| 20+ advanced templates                                        |             | ✓          | ✓         |
| Built-in advanced AI models (no key needed)                   |             | ✓          | ✓         |
| 10+ AI agents and resources                                   |             | ✓          | ✓         |
| Automatic citation formatting                                 |             | ✓          | ✓         |
| Access to Insilico curated databases:                         |             | ✓          | ✓         |
| &nbsp;&nbsp;&nbsp;&nbsp;a. Full-text publication database     |             | ✓          | ✓         |
| &nbsp;&nbsp;&nbsp;&nbsp;b. PandaOmics multiomics data         |             | ✓          | ✓         |
| &nbsp;&nbsp;&nbsp;&nbsp;c. Clinical trials database           |             | ✓          | ✓         |
| &nbsp;&nbsp;&nbsp;&nbsp;d. Biomedical Knowledge graph         |             | ✓          | ✓         |
| On-premise deployment                                         |             |            | ✓         |
| Custom AI models                                              |             |            | ✓         |
| Custom agents & tools by request                              |             |            | ✓         |
| Priority support                                              |             |            | ✓         |


> **Note**
> 
>\* Web search is supported in limited regions. You can configure your own Seper API key in .env file.
>
>\*\* Requires a deployment of the [Precious3GPT](https://huggingface.co/insilicomedicine/precious3-gpt) model.
