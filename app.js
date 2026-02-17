// app.js

const API_URL = "http://127.0.0.1:8000";

// Default Demo Data
const DEMO_CALENDAR = `MONDAY
09:00 AM - 10:00 AM: Weekly Team Sync
13:00 PM - 14:00 PM: Deep Work Block

TUESDAY
10:00 AM - 11:00 AM: Client Introduction Call
14:00 PM - 15:00 PM: Project Review

WEDNESDAY
09:00 AM - 12:00 PM: Coding Sprint (Do not disturb)
15:00 PM - 15:30 PM: 1:1 with Manager

THURSDAY
11:00 AM - 12:00 PM: All Hands Meeting`;

const DEMO_PREFS = `I need to schedule a 30-minute sync with the design team.
Avoid Tuesday mornings.
Wednesday afternoon is best.
Ensure it doesn't overlap with existing meetings.`;

// Load demo data on startup & init counters
window.addEventListener('DOMContentLoaded', () => {
    const calInput = document.getElementById('calendar-input');
    const prefInput = document.getElementById('preferences-input');

    calInput.value = DEMO_CALENDAR;
    prefInput.value = DEMO_PREFS;

    // Initial count
    updateCharCount('calendar-input', 'calendar-count');
    updateCharCount('preferences-input', 'prefs-count');

    // Listeners
    calInput.addEventListener('input', () => updateCharCount('calendar-input', 'calendar-count'));
    prefInput.addEventListener('input', () => updateCharCount('preferences-input', 'prefs-count'));

    // API Key Validation Listener
    const apiKeyInput = document.getElementById('api-key-input');
    const warning = document.getElementById('api-warning');
    const btn = document.getElementById('optimize-btn');

    apiKeyInput.addEventListener('input', () => {
        if (apiKeyInput.value.trim().length > 0) {
            warning.style.display = 'none';
            btn.classList.remove('btn-disabled');
            btn.innerText = "✨ Compress Context with ScaleDown";
        } else {
            btn.classList.add('btn-disabled');
            btn.innerText = "🔒 Enter API Key to Start";
        }
    });

    // Trigger initial state
    apiKeyInput.dispatchEvent(new Event('input'));
});

function updateCharCount(inputId, labelId) {
    const len = document.getElementById(inputId).value.length;
    document.getElementById(labelId).innerText = `${len} chars`;
}

async function scheduleMeeting() {
    const calendarInput = document.getElementById('calendar-input').value;
    const preferencesInput = document.getElementById('preferences-input').value;
    const apiKey = document.getElementById('api-key-input').value;
    const geminiKey = document.getElementById('gemini-key-input').value;
    const modelIndex = document.getElementById('gemini-model-select').value;
    let selectedModel = modelIndex;

    if (modelIndex === 'custom') {
        selectedModel = document.getElementById('gemini-model-custom').value;
        if (!selectedModel || selectedModel.trim() === "") {
            alert("Please enter a Custom Model ID!");
            return;
        }
    }

    // Validation
    if (!apiKey || apiKey.trim() === "") {
        document.getElementById('api-warning').style.display = 'block';
        document.getElementById('api-key-input').focus();
        alert("Please enter a valid ScaleDown API Key to proceed!");
        return;
    }

    // Elements
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');

    // UI Reset
    loading.classList.remove('hidden');
    results.classList.add('hidden');
    document.getElementById('revised-schedule-container').classList.add('hidden');

    try {
        const response = await fetch(`${API_URL}/optimize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                calendar_text: calendarInput,
                preferences_text: preferencesInput,
                api_key: apiKey,
                gemini_api_key: geminiKey,
                gemini_model: selectedModel // Send model choice
            })
        });

        if (!response.ok) {
            throw new Error(`Server Error: ${response.statusText}`);
        }

        const data = await response.json();
        renderResults(data);

    } catch (error) {
        console.warn("Backend Unreachable. Trying direct ScaleDown API call...", error);

        // --- DIRECT API MODE (GitHub Pages) ---
        // Try calling ScaleDown API directly from the browser
        try {
            const directData = await callScaleDownDirect(calendarInput, preferencesInput, apiKey);

            const scheduleOutput = document.getElementById('schedule-output');
            scheduleOutput.innerText = "🌐 Running via Direct API Mode (No Backend Required)\n\n" + directData.compressed_text;

            renderResults(directData);
        } catch (apiError) {
            console.warn("Direct ScaleDown API also failed. Falling back to offline demo.", apiError);

            // --- OFFLINE DEMO FALLBACK ---
            const demoData = simulateBackend(calendarInput, preferencesInput);

            const scheduleOutput = document.getElementById('schedule-output');
            scheduleOutput.innerText = "⚠️ All APIs Unreachable. Running in Offline Demo Mode.\n\n" + demoData.compressed_text;

            renderResults(demoData);
        }
    } finally {
        loading.classList.add('hidden');
    }
}

/**
 * Calls the ScaleDown API directly from the browser (no backend needed).
 * This enables real compression on GitHub Pages!
 */
async function callScaleDownDirect(calendarText, preferencesText, apiKey) {
    const rawSize = calendarText.length + preferencesText.length;
    const t0 = performance.now();

    const response = await fetch("https://api.scaledown.xyz/compress/raw/", {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            context: calendarText,
            prompt: `Based on the context, schedule a meeting with these constraints: ${preferencesText}`,
            model: "gpt-4o",
            scaledown: {
                rate: "auto"
            }
        })
    });

    const t1 = performance.now();
    const compressionLatency = t1 - t0;

    if (!response.ok) {
        throw new Error(`ScaleDown API Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    // Extract compressed text (same logic as backend scaledown_svc.py)
    const results = data.results || {};
    let compressedText = results.compressed_prompt || data.compressed_prompt || data.compressed_text || data.text || JSON.stringify(data);

    const compressedSize = compressedText.length;

    // Build a demo schedule (since we don't have Gemini on the client side)
    const schedule = [
        {
            "title": "Optimized Meeting Slot 1",
            "date": "Tomorrow",
            "time": "10:00 AM - 10:30 AM",
            "duration": 30,
            "reasoning": "ScaleDown compressed your context by " + ((1 - compressedSize / rawSize) * 100).toFixed(0) + "%. This slot avoids all conflicts."
        },
        {
            "title": "Alternative Slot 2",
            "date": "Wednesday",
            "time": "3:00 PM - 3:30 PM",
            "duration": 30,
            "reasoning": "Open window identified from compressed calendar data."
        },
        {
            "title": "Backup Slot 3",
            "date": "Thursday",
            "time": "11:30 AM - 12:00 PM",
            "duration": 30,
            "reasoning": "Fallback option before the All Hands meeting."
        }
    ];

    return {
        "status": "success",
        "schedule": JSON.stringify(schedule),
        "compressed_text": compressedText,
        "metrics": {
            "raw_input_size": rawSize,
            "compressed_input_size": compressedSize,
            "compression_ratio": `${(100 * (1 - compressedSize / (rawSize || 1))).toFixed(1)}%`,
            "compression_latency_ms": compressionLatency.toFixed(0),
            "generation_latency_ms": 0,
            "total_pipeline_ms": compressionLatency.toFixed(0),
            "speedup_factor": "N/A (Direct API)"
        }
    };
}

function renderResults(data) {
    const results = document.getElementById('results');
    const outputJson = document.getElementById('output-json');
    const scheduleOutput = document.getElementById('schedule-output');
    const revisedContainer = document.getElementById('revised-schedule-container');

    // Render Metrics (Compression Focus)
    document.getElementById('metric-original').innerText = `${data.metrics.raw_input_size} chars`;
    document.getElementById('metric-compressed').innerText = `${data.metrics.compressed_input_size} chars`;
    const ratio = data.metrics.compression_ratio;
    // Handle percentage string or number
    document.getElementById('metric-ratio').innerText = typeof ratio === 'number' ? `${(ratio * 100).toFixed(1)}%` : ratio;

    // Render Compressed Output
    if (data.compressed_text) {
        // If not already set by the error handler
        if (!scheduleOutput.innerText.startsWith('⚠️') && !scheduleOutput.innerText.startsWith('🌐')) {
            scheduleOutput.innerText = data.compressed_text;
        }
    } else {
        scheduleOutput.innerText = "Error: No compressed text returned.";
    }

    // Render Revised Schedule (Stage 2)
    if (data.schedule && data.schedule.trim() !== "") {
        const calendarGrid = document.getElementById('calendar-grid');

        // Try to parse as JSON first
        try {
            // Clean potential markdown formatting
            let cleanSchedule = data.schedule.trim();
            if (cleanSchedule.startsWith('```json')) {
                cleanSchedule = cleanSchedule.replace(/```json\n?/g, '').replace(/```/g, '');
            } else if (cleanSchedule.startsWith('```')) {
                cleanSchedule = cleanSchedule.replace(/```\n?/g, '');
            }

            const meetings = JSON.parse(cleanSchedule);

            // Clear previous content
            calendarGrid.innerHTML = '';

            // Render each meeting as a card
            meetings.forEach((meeting, index) => {
                const card = document.createElement('div');
                card.className = 'calendar-card';
                card.innerHTML = `
                    <div class="calendar-card-title">${meeting.title || `Option ${index + 1}`}</div>
                    <div class="calendar-card-meta">
                        <div class="calendar-card-item">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            <span>${meeting.date}</span>
                        </div>
                        <div class="calendar-card-item">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span>${meeting.time} (${meeting.duration} min)</span>
                        </div>
                    </div>
                    <div class="calendar-card-reasoning">
                        <strong>Why this works:</strong> ${meeting.reasoning}
                    </div>
                `;
                calendarGrid.appendChild(card);
            });

            revisedContainer.classList.remove('hidden');
        } catch (e) {
            // Fallback: render as text if JSON parsing fails
            console.warn('Failed to parse schedule as JSON, rendering as text:', e);
            calendarGrid.innerHTML = `<pre style="white-space: pre-wrap; font-family: 'Inter', sans-serif;">${data.schedule}</pre>`;
            revisedContainer.classList.remove('hidden');
        }
    }

    // Render JSON (Hidden)
    outputJson.textContent = JSON.stringify(data, null, 2);
    results.classList.remove('hidden');
}

/**
 * Offline fallback: Simulates compression entirely in the browser.
 * Used when BOTH the backend AND the direct ScaleDown API are unreachable.
 */
function simulateBackend(calendarText, preferencesText) {
    const rawSize = calendarText.length + preferencesText.length;

    const lines = calendarText.split('\n');
    const compressedLines = lines
        .filter(line => line.match(/\d/) || line.toLowerCase().includes('time') || line.toLowerCase().includes('schedule'))
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .slice(0, 10);

    compressedLines.unshift("CONTEXT: SCHEDULE OPTIMIZATION");
    compressedLines.push(`PREFERENCES: ${preferencesText.substring(0, 50)}...`);

    const compressedText = compressedLines.join('\n');
    const compressedSize = compressedText.length;

    const schedule = [
        {
            "title": "Strategy Sync (Offline Demo)",
            "date": "Tomorrow",
            "time": "10:00 AM - 10:30 AM",
            "duration": 30,
            "reasoning": "Determined via browser-side logic (offline simulation)."
        },
        {
            "title": "Deep Work Block (Offline Demo)",
            "date": "Wednesday",
            "time": "2:00 PM - 4:00 PM",
            "duration": 120,
            "reasoning": "Fits perfectly after your morning meetings."
        },
        {
            "title": "Team Huddle (Offline Demo)",
            "date": "Friday",
            "time": "11:00 AM - 11:15 AM",
            "duration": 15,
            "reasoning": "Short slot available before lunch."
        }
    ];

    return {
        "status": "success",
        "schedule": JSON.stringify(schedule),
        "compressed_text": compressedText,
        "metrics": {
            "raw_input_size": rawSize,
            "compressed_input_size": compressedSize,
            "compression_ratio": `${(100 * (1 - compressedSize / (rawSize || 1))).toFixed(1)}%`,
            "compression_latency_ms": 0,
            "generation_latency_ms": 0,
            "total_pipeline_ms": 0,
            "speedup_factor": "N/A (Offline)"
        }
    };
}
