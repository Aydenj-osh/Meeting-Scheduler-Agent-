from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import time
import logging
import os
from typing import Dict, Any, Optional

from .scaledown_svc import ScaleDownService
from .generative_svc import GeminiService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MeetingSchedulerAgent")

app = FastAPI(title="Meeting Scheduler Agent", version="2.0.0")

# CORS (Allow frontend access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Services
compressor = ScaleDownService()
generator = GeminiService()

class ScheduleRequest(BaseModel):
    calendar_text: str
    preferences_text: str
    api_key: str = ""
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-2.5-flash"  # Default model

@app.middleware("http")
async def log_processing_time(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000  # ms
    logger.info(f"Endpoint: {request.url.path} | Total Latency: {process_time:.2f}ms")
    return response

@app.post("/optimize")
async def optimize_schedule(payload: ScheduleRequest):
    """
    AI Pipeline:
    1. Receive Raw Text (Calendar + Prefs) + API KEY
    2. SEND TO SCALEDOWN -> Returns Compressed Context
    3. SEND TO GEN_AI -> Returns Schedule (Faster due to compression)
    """
    try:
        logger.info(f"Received optimization request. Model: {payload.gemini_model}")
        
        # --- baseline simulation ---
        # Calculate how long it WOULD have taken with raw data
        raw_size = len(payload.calendar_text) + len(payload.preferences_text)
        estimated_raw_latency = 500 + (raw_size * 0.5) # Same formula as GenAI
        
        # --- Step 1: Compression (ScaleDown) ---
        t0 = time.time()
        # Pass the API key to the service
        compressed_text = compressor.compress_text(payload.calendar_text, payload.preferences_text, payload.api_key)
        t1 = time.time()
        compression_latency = (t1 - t0) * 1000
        
        # --- Step 2: Generation (AI Agent) ---
        t2 = time.time()
        schedule_result = generator.generate_schedule(
            compressed_text, 
            api_key=payload.gemini_api_key,
            model_name=payload.gemini_model
        )
        t3 = time.time()
        generation_latency = (t3 - t2) * 1000
        
        total_pipeline_latency = compression_latency + generation_latency
        
        return {
            "status": "success",
            "schedule": schedule_result,
            "compressed_text": compressed_text, # Expose the raw compressed text
            "metrics": {
                "raw_input_size": raw_size,
                "compressed_input_size": len(compressed_text),
                "compression_ratio": f"{100 * (1 - len(compressed_text)/raw_size):.1f}%",
                "compression_latency_ms": compression_latency,
                "generation_latency_ms": generation_latency,
                "total_pipeline_ms": total_pipeline_latency,
                "baseline_raw_ms_est": estimated_raw_latency,
                "speedup_factor": f"{estimated_raw_latency / total_pipeline_latency:.1f}x"
            }
        }

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Serve Frontend (Root Level)
# This setup matches the user's flat directory structure (GitHub Pages style)

@app.get("/")
async def read_root():
    return FileResponse("index.html")

@app.get("/app.js")
async def read_js():
    return FileResponse("app.js")

@app.get("/style.css")
async def read_css():
    return FileResponse("style.css")

# Mount root allows serving other potential assets if needed, but be careful not to expose backend code.
# Since we are specific above, we might not need a general mount, but having one for assets if any:
# app.mount("/static", StaticFiles(directory="static"), name="static") 
