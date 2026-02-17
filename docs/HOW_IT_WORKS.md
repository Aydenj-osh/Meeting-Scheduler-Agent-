# How It Works: Visual Guide

## The 3-Tier Fallback System

When the user clicks "Compress & Optimize", the app tries three approaches in order:

```
User clicks button
        │
        ▼
┌───────────────────────────┐
│  TRY 1: Call Backend      │
│  POST /optimize           │
│  (http://127.0.0.1:8000)  │
└───────────┬───────────────┘
            │
     ┌──────┴──────┐
     │ Success?    │
     └──────┬──────┘
        YES │           NO (ERR_CONNECTION_REFUSED)
            │                    │
            ▼                    ▼
    Show real results   ┌───────────────────────────┐
    (ScaleDown +        │  TRY 2: Call ScaleDown     │
     Gemini ran on      │  directly from browser     │
     the server)        │  fetch("api.scaledown.xyz")│
                        └───────────┬───────────────┘
                                    │
                             ┌──────┴──────┐
                             │ Success?    │
                             └──────┬──────┘
                                YES │           NO (CORS / bad key / no internet)
                                    │                    │
                                    ▼                    ▼
                            Show real               ┌───────────────────────────┐
                            compression             │  TRY 3: Offline Demo      │
                            + demo schedule         │  simulateBackend()        │
                            cards                   │  (line filtering in JS)    │
                                                    └───────────┬───────────────┘
                                                                │
                                                                ▼
                                                        Show filtered text
                                                        + hardcoded demo
                                                        schedule cards
```

---

## The Two-Stage AI Pipeline (Backend Mode)

This is the full pipeline when running locally with both API keys:

```
┌──────────────────┐
│  USER INPUT       │
│  Calendar text    │
│  + Preferences    │
│  + ScaleDown key  │
│  + Gemini key     │
│  + Model choice   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  STAGE 1: COMPRESSION (ScaleDown AI)      │
│                                           │
│  Input:  Raw calendar (e.g. 5000 chars)   │
│  API:    api.scaledown.xyz/compress/raw/  │
│  Output: Compressed text (e.g. 1000 chars)│
│  Time:   Measured with time.time()        │
│                                           │
│  What it does:                            │
│  ScaleDown's AI removes noise and         │
│  redundant information from the calendar  │
│  while keeping the semantic meaning.      │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  STAGE 2: REASONING (Google Gemini)       │
│                                           │
│  Input:  Compressed text (fewer tokens!)  │
│  API:    Google Gemini (generativeai lib)  │
│  Prompt: "Propose 3 optimal meeting       │
│           times as JSON array"            │
│  Output: JSON array with 3 options:       │
│          title, date, time, duration,     │
│          reasoning                        │
│  Time:   Measured with time.time()        │
│                                           │
│  Why faster: Gemini processes fewer       │
│  tokens because ScaleDown already         │
│  removed the noise.                       │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  RESPONSE TO BROWSER                      │
│                                           │
│  Metrics returned:                        │
│  - raw_input_size (chars)                 │
│  - compressed_input_size (chars)          │
│  - compression_ratio (%)                  │
│  - compression_latency_ms (measured)      │
│  - generation_latency_ms (measured)       │
│  - total_pipeline_ms (sum of above)       │
│  - baseline_raw_ms_est (ESTIMATED*)       │
│  - speedup_factor (ESTIMATED*)            │
│                                           │
│  *baseline uses formula: 500 + chars×0.5  │
│   This is a hypothetical estimate, not    │
│   a real measurement.                     │
└──────────────────────────────────────────┘
```

---

## Direct API Mode (GitHub Pages)

When there's no backend, `app.js` calls ScaleDown directly:

```
┌──────────────────┐
│  USER INPUT       │
│  (same as above)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  COMPRESSION ONLY (ScaleDown AI)          │
│                                           │
│  Called from: app.js callScaleDownDirect() │
│  Uses: JavaScript fetch() API             │
│  Same endpoint, same payload as backend   │
│                                           │
│  Timing: performance.now() before/after   │
│  This is REAL measured latency.           │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  NO GEMINI CALL                           │
│                                           │
│  Gemini is NOT called from the browser.   │
│  Instead, 3 demo schedule cards are       │
│  generated client-side with placeholder   │
│  reasoning text.                          │
│                                           │
│  generation_latency = 0                   │
│  speedup_factor = "N/A (Direct API)"      │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  DISPLAYED IN BROWSER                     │
│                                           │
│  Status: "🌐 Running via Direct API Mode" │
│  Metrics: Real compression stats          │
│  Schedule: Client-generated demo cards    │
└──────────────────────────────────────────┘
```

---

## File Map

```
MeetingScheduler/
├── index.html          ← HTML structure (forms, cards, grid)
├── style.css           ← CSS (dark theme, glassmorphism, animations)
├── app.js              ← Frontend logic (API calls, fallbacks, rendering)
│
├── backend/
│   ├── main.py         ← FastAPI server, /optimize endpoint
│   ├── scaledown_svc.py ← ScaleDown API wrapper
│   └── generative_svc.py ← Gemini API wrapper
│
├── docs/
│   ├── ARCHITECTURE.md  ← Technical breakdown
│   ├── LATENCY_REPORT.md ← Metrics explanation
│   └── HOW_IT_WORKS.md  ← This file (visual flowcharts)
│
├── demo/               ← Sample calendar data files
├── run.bat             ← Start backend server
├── install.bat         ← Install Python dependencies
├── requirements.txt    ← fastapi, uvicorn, requests
├── README.md           ← Project overview
└── LICENSE             ← MIT
```
