# Latency & Compression Report

## What This Report Covers

This report explains how latency and compression are measured in the Meeting Scheduler Agent. Every number below is either **measured by the code** or **clearly labeled as estimated**.

---

## Compression: How It's Measured

### Real ScaleDown API Compression (Backend Mode)

When the backend is running and a ScaleDown API key is provided, compression happens via the real API.

**What the code does** (`scaledown_svc.py` lines 30-76):
1. Sends raw calendar text as `context` and preferences as `prompt` to `https://api.scaledown.xyz/compress/raw/`
2. ScaleDown AI compresses the context while retaining semantic meaning
3. Returns `results.compressed_prompt` — the actual AI-compressed text

**How compression ratio is calculated** (`main.py` line 90):
```
compression_ratio = 100 × (1 - compressed_chars / raw_chars)
```

Where:
- `raw_chars` = `len(calendar_text) + len(preferences_text)` — measured from user input
- `compressed_chars` = `len(compressed_text)` — measured from ScaleDown API response

### Real ScaleDown API Compression (Direct API Mode)

When running on GitHub Pages, `app.js` calls the same ScaleDown endpoint directly.

**How it's measured** (`app.js` lines 155-222):
```javascript
const rawSize = calendarText.length + preferencesText.length;  // User input
const compressedSize = compressedText.length;  // From API response
const ratio = 100 * (1 - compressedSize / rawSize);
```

### Offline Simulation (No API)

When no API is available, `simulateBackend()` in `app.js` (lines 317-371) does basic line filtering:
- Keeps lines containing digits
- Keeps lines containing "time" or "schedule"
- Limits to 10 lines
- This is NOT AI compression — it's string filtering

---

## Latency: What's Real vs Estimated

### What IS Measured (Real Timings)

| Measurement | Method | Code Location |
|---|---|---|
| **ScaleDown compression time** (Backend) | `time.time()` before and after `requests.post()` | `main.py` lines 65-69 |
| **Gemini generation time** (Backend) | `time.time()` before and after `model.generate_content()` | `main.py` lines 72-79 |
| **ScaleDown compression time** (Direct API) | `performance.now()` before and after `fetch()` | `app.js` lines 156, 174-175 |
| **Total pipeline time** (Backend) | `compression_latency + generation_latency` | `main.py` line 81 |

These are real, measured durations of actual API calls.

### What IS Estimated (Not Real)

| Value | Formula | Code Location | Why |
|---|---|---|---|
| **Baseline raw latency** | `500 + (raw_chars × 0.5)` ms | `main.py` line 62 | This simulates how long Gemini **would** take if given uncompressed input. It's a hypothetical estimate, not a real measurement. |
| **Speedup factor** | `estimated_raw_latency / total_pipeline_latency` | `main.py` line 95 | Since the baseline is estimated, the speedup factor is also an estimate. |
| **Gemini simulation latency** | `500 + (prompt_length × 0.5)` ms + `time.sleep()` | `generative_svc.py` lines 87-92 | When no Gemini key is provided, this artificially delays the response to simulate processing time. |

### Direct API Mode Latency

In Direct API mode (`app.js`), **only the ScaleDown call is timed**. Gemini is not called, so:
- `generation_latency_ms = 0`
- `speedup_factor = "N/A (Direct API)"`

### Offline Demo Mode Latency

In offline demo mode, no API calls happen, so:
- `compression_latency_ms = 0`
- `generation_latency_ms = 0`
- `speedup_factor = "N/A (Offline)"`

---

## The Core Argument: Why Compression Helps

The ScaleDown pipeline's value proposition:

1. **LLM processing time scales with input tokens** — sending fewer tokens to Gemini means faster responses
2. **ScaleDown reduces the input** — the API compresses calendar data while keeping the meaning intact
3. **Net effect** — even though ScaleDown adds one extra API call, the reduced Gemini processing time more than compensates

```
Without ScaleDown:
  Gemini processes 5000 chars → Slower response

With ScaleDown:
  ScaleDown compresses 5000 → ~1000 chars (adds ~1-3 seconds)
  Gemini processes 1000 chars → Faster response
  Net: Faster overall if Gemini savings > ScaleDown overhead
```

This is the architectural principle. The actual speedup depends on:
- The size of the input data
- The ScaleDown compression ratio achieved
- The Gemini model used and its per-token latency
- Network conditions

**We do not claim specific speedup numbers** because they vary per request. The dashboard shows real-time metrics for each individual run.
