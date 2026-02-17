# Architecture Overview: AI-to-AI Pipeline

## High-Level Flow

```mermaid
graph LR
    User[User / Frontend] -->|Raw Text (10k chars)| API[FastAPI Server]
    API -->|Raw Text + API Key| SD[ScaleDown Service]
    SD -->|Compressed Context (1k chars)| API
    API -->|Compressed Context| GenAI[Generative AI Service]
    GenAI -->|Optimal Schedule| API
    API -->|Response + Metrics| User
```

## Component Breakdown

### 1. ScaleDown Service (`scaledown_svc.py`)
- **Role**: Context Compressor.
- **Function**: Takes verbose calendar exports and user constraints. Prunes "noise" (HTML, metadata).
- **Latency Impact**: Adds a small fixed overhead, but reduces downstream payload by ~80-90%.

### 2. Generative AI Service (`generative_svc.py`)
- **Role**: Reasoning Engine.
- **Function**: Takes the *clean, compressed* context and "thinks" of the best schedule options.
- **Latency Impact**: heavily dependent on input token count. By receiving compressed data, it runs significantly faster.

### 3. API Layer (`main.py`)
- **Role**: Orchestrator.
- **Function**: 
    - Validates API Keys.
    - Chains the services (ScaleDown -> GenAI).
    - Calculates "Speedup Factor" metrics.
