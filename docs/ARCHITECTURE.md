# Architecture: Meeting Scheduler Agent

## System Overview

The Meeting Scheduler Agent is a two-stage AI pipeline that compresses calendar data before sending it to a generative model. It runs in **three modes** depending on the environment.

---

## Execution Modes

### Mode 1: Full Backend (Local Server)

When running locally via `run.bat`, the Python backend handles everything.

```
┌─────────────┐     ┌────────────────────────────────────────────┐     ┌──────────────┐
│   Browser    │────>│  FastAPI Backend (http://127.0.0.1:8000)   │────>│   Browser     │
│  (app.js)    │     │                                            │     │  (renders     │
│              │     │  1. POST /optimize receives:               │     │   results)    │
│  Sends:      │     │     - calendar_text                        │     │              │
│  - Calendar  │     │     - preferences_text                     │     │  Displays:   │
│  - Prefs     │     │     - api_key (ScaleDown)                  │     │  - Metrics   │
│  - API Keys  │     │     - gemini_api_key                       │     │  - Compressed│
│  - Model     │     │     - gemini_model                         │     │    text      │
│              │     │                                            │     │  - Schedule  │
│              │     │  2. Calls ScaleDownService.compress_text() │     │    cards     │
│              │     │     -> https://api.scaledown.xyz/compress/  │     │              │
│              │     │        raw/                                 │     │              │
│              │     │     -> Falls back to local filter if no key │     │              │
│              │     │                                            │     │              │
│              │     │  3. Calls GeminiService.generate_schedule() │     │              │
│              │     │     -> Google Gemini API                    │     │              │
│              │     │     -> Falls back to simulation if no key   │     │              │
│              │     │                                            │     │              │
│              │     │  4. Returns JSON with metrics + schedule    │     │              │
└─────────────┘     └────────────────────────────────────────────┘     └──────────────┘
```

### Mode 2: Direct API (GitHub Pages)

When deployed to GitHub Pages (no backend), `app.js` calls ScaleDown directly from the browser.

```
┌─────────────────────────────────────────────────┐
│  Browser (app.js)                                │
│                                                  │
│  1. fetch("http://127.0.0.1:8000/optimize")      │
│     -> ERR_CONNECTION_REFUSED (no backend)        │
│                                                  │
│  2. catch block calls callScaleDownDirect()       │
│     -> fetch("https://api.scaledown.xyz/          │
│        compress/raw/")                            │
│     -> Sends: context, prompt, model, rate        │
│     -> Headers: x-api-key, Content-Type           │
│     -> Response: compressed_prompt (real AI       │
│        compression)                               │
│                                                  │
│  3. Schedule cards are generated client-side      │
│     (Gemini is NOT called in this mode)           │
│                                                  │
│  4. Metrics shown from real API response          │
│     - Original size (chars)                       │
│     - Compressed size (chars)                     │
│     - Compression ratio (%)                       │
│     - Compression latency (ms via performance.now)│
└─────────────────────────────────────────────────┘
```

### Mode 3: Offline Demo

When both the backend AND ScaleDown API are unreachable (no internet, CORS blocked, invalid key).

```
┌─────────────────────────────────────────────────┐
│  Browser (app.js)                                │
│                                                  │
│  1. Backend call fails                            │
│  2. ScaleDown direct call also fails              │
│  3. simulateBackend() runs entirely in browser:   │
│     - Filters calendar lines containing digits    │
│     - Keeps lines with "time" or "schedule"       │
│     - Limits to 10 lines max                      │
│     - Adds "CONTEXT:" header and truncated prefs  │
│  4. Hardcoded demo schedule cards shown            │
│  5. All latency metrics show 0ms                   │
└─────────────────────────────────────────────────┘
```

---

## File-by-File Breakdown

### Frontend (Served on GitHub Pages)

| File | Lines | What It Does |
|------|-------|-------------|
| `index.html` | 259 | HTML structure: input forms, metric cards, loading spinner, schedule card grid, theme toggle. Links to `style.css` and `app.js`. |
| `style.css` | ~9000 | All CSS: dark/light theme, glassmorphism cards, gradients, responsive layout, loading animations. |
| `app.js` | 372 | Core logic: demo data loading, API calls (3-tier fallback), metrics rendering, schedule card rendering. |

### Backend (Python, runs locally only)

| File | Lines | What It Does |
|------|-------|-------------|
| `backend/main.py` | 125 | FastAPI server. Defines `POST /optimize` endpoint. Chains ScaleDown → Gemini. Calculates latency metrics. Serves static files. |
| `backend/scaledown_svc.py` | 119 | `ScaleDownService` class. Calls `https://api.scaledown.xyz/compress/raw/` with `x-api-key` header. Sends `context`, `prompt`, `model: "gpt-4o"`, `scaledown.rate: "auto"`. Extracts `results.compressed_prompt` from response. Falls back to local line-filtering if no API key. |
| `backend/generative_svc.py` | 109 | `GeminiService` class. Calls Google Gemini API (`google.generativeai`). Sends enhanced prompt requesting JSON array of 3 meeting options. Falls back to simulated schedule with artificial delay (`500ms + chars * 0.5ms`) if no Gemini key. |

### Config & Scripts

| File | What It Does |
|------|-------------|
| `run.bat` | Starts the FastAPI server via `uvicorn`. |
| `install.bat` | Runs `pip install -r requirements.txt`. |
| `requirements.txt` | Python dependencies: `fastapi`, `uvicorn`, `requests`. |
| `.gitignore` | Ignores `__pycache__`, `.env`, etc. |

---

## ScaleDown API Integration (Exact Details)

**Endpoint:** `POST https://api.scaledown.xyz/compress/raw/`

**Request Headers:**
```
x-api-key: <user's ScaleDown API key>
Content-Type: application/json
```

**Request Body:**
```json
{
    "context": "<raw calendar text>",
    "prompt": "Based on the context, schedule a meeting with these constraints: <user preferences>",
    "model": "gpt-4o",
    "scaledown": {
        "rate": "auto"
    }
}
```

**Response:** JSON containing `results.compressed_prompt` (the AI-compressed text).

**Called From:**
- `backend/scaledown_svc.py` line 52 (Python `requests.post`)
- `app.js` line 158 (JavaScript `fetch`, direct browser call)

---

## Gemini API Integration (Exact Details)

**Library:** `google.generativeai` (Python)

**Called Only From:** `backend/generative_svc.py` (NOT called from browser)

**Prompt Structure:** Asks Gemini to return a JSON array of 3 meeting objects, each with `title`, `date`, `time`, `duration`, `reasoning`.

**Models Supported:** `gemini-2.5-flash` (default), `gemini-1.5-flash`, `gemini-1.5-pro`, or any custom model ID.

**Fallback:** If no Gemini key is provided, `_simulate_generation()` adds an artificial delay of `500 + (prompt_length * 0.5)` milliseconds and returns a hardcoded text schedule.

---

## Metrics Calculation (Exact Code)

### Backend Mode (`main.py` lines 59-96)

```python
raw_size = len(calendar_text) + len(preferences_text)
estimated_raw_latency = 500 + (raw_size * 0.5)  # Hypothetical baseline

compression_latency = (t1 - t0) * 1000   # Real measured time (ScaleDown call)
generation_latency = (t3 - t2) * 1000     # Real measured time (Gemini call)
total_pipeline_latency = compression_latency + generation_latency

compression_ratio = 100 * (1 - len(compressed_text) / raw_size)
speedup_factor = estimated_raw_latency / total_pipeline_latency
```

**Note:** `estimated_raw_latency` is a **simulated baseline** using the formula `500 + (chars * 0.5)ms`. It estimates how long Gemini would take with uncompressed input. The `speedup_factor` compares this estimate against the actual measured pipeline time.

### Direct API Mode (`app.js` lines 155-227)

```javascript
const t0 = performance.now();
// ... fetch ScaleDown API ...
const t1 = performance.now();
const compressionLatency = t1 - t0;  // Real measured time

compression_ratio = 100 * (1 - compressedSize / rawSize);
generation_latency_ms = 0;  // Gemini is not called
speedup_factor = "N/A (Direct API)";
```

### Offline Mode (`app.js` lines 317-371)

All latency values are `0`. Compression is basic line-filtering in JavaScript. `speedup_factor = "N/A (Offline)"`.
