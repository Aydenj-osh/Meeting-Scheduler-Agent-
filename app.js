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
 * Then calls Gemini API directly for REAL schedule generation.
 */
async function callScaleDownDirect(calendarText, preferencesText, apiKey) {
    const geminiKey = document.getElementById('gemini-key-input').value;
    const modelIndex = document.getElementById('gemini-model-select').value;
    let selectedModel = modelIndex;
    if (modelIndex === 'custom') {
        selectedModel = document.getElementById('gemini-model-custom').value || 'gemini-2.0-flash';
    }

    const rawSize = calendarText.length + preferencesText.length;

    // --- Stage 1: ScaleDown Compression ---
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

    // --- Stage 2: Gemini Schedule Generation ---
    let scheduleText = "";
    let generationLatency = 0;

    if (geminiKey && geminiKey.trim() !== "") {
        try {
            console.log("🤖 Calling Gemini API directly from browser...");
            const t2 = performance.now();
            scheduleText = await callGeminiDirect(compressedText, preferencesText, geminiKey, selectedModel);
            const t3 = performance.now();
            generationLatency = t3 - t2;
            console.log(`✅ Gemini responded in ${generationLatency.toFixed(0)}ms`);
        } catch (geminiErr) {
            console.warn("⚠️ Gemini direct call failed, using demo schedule:", geminiErr);
            scheduleText = getFallbackSchedule(compressedText, rawSize, compressedSize);
        }
    } else {
        console.log("ℹ️ No Gemini key provided. Using demo schedule cards.");
        scheduleText = getFallbackSchedule(compressedText, rawSize, compressedSize);
    }

    const totalLatency = compressionLatency + generationLatency;

    return {
        "status": "success",
        "schedule": scheduleText,
        "compressed_text": compressedText,
        "metrics": {
            "raw_input_size": rawSize,
            "compressed_input_size": compressedSize,
            "compression_ratio": `${(100 * (1 - compressedSize / (rawSize || 1))).toFixed(1)}%`,
            "compression_latency_ms": compressionLatency.toFixed(0),
            "generation_latency_ms": generationLatency.toFixed(0),
            "total_pipeline_ms": totalLatency.toFixed(0),
            "speedup_factor": generationLatency > 0 ? `Real AI` : "N/A (No Gemini Key)"
        }
    };
}

/**
 * Calls Google Gemini REST API directly from the browser.
 * Uses the same prompt structure as backend/generative_svc.py.
 */
async function callGeminiDirect(compressedText, preferencesText, geminiKey, modelName) {
    // Gemini REST API endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;

    const prompt = `You are an expert meeting scheduler.
Based on the following compressed calendar context and user preferences, propose 3 optimal meeting times.

COMPRESSED CALENDAR CONTEXT:
${compressedText}

USER PREFERENCES:
${preferencesText}

OUTPUT FORMAT (JSON ONLY):
Return a valid JSON array with exactly 3 meeting options. Each option must have:
- "title": Short title (max 5 words)
- "date": Day name from the calendar (e.g., "Monday", "Tuesday")
- "time": Time range (e.g., "10:00 AM - 11:00 AM")
- "duration": Duration in minutes (number)
- "reasoning": One sentence, max 15 words, explaining why this slot works

Keep the entire response under 500 characters. Return ONLY the JSON array. No markdown, no code fences, no extra text.`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,
                // Disable "thinking" for gemini-2.5 models so all tokens go to the answer
                thinkingConfig: { thinkingBudget: 0 }
            }
        })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData?.error?.message || response.statusText;
        throw new Error(`Gemini API Error (${response.status}): ${errMsg}`);
    }

    const result = await response.json();

    // Extract text from Gemini response
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error("Gemini returned empty response");
    }

    // Clean markdown fences if present
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\n?/g, '').replace(/```/g, '');
    } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\n?/g, '');
    }
    cleanText = cleanText.trim();

    // Try to fix truncated JSON (unterminated strings)
    try {
        JSON.parse(cleanText);
    } catch (e) {
        console.warn("Gemini JSON needs repair, attempting fix...");
        // Try closing any unclosed strings, objects, and arrays
        let fixed = cleanText;
        // Count brackets to see what's missing
        const openBraces = (fixed.match(/{/g) || []).length;
        const closeBraces = (fixed.match(/}/g) || []).length;
        const openBrackets = (fixed.match(/\[/g) || []).length;
        const closeBrackets = (fixed.match(/\]/g) || []).length;

        // If truncated mid-string, close the string and object
        if (fixed.endsWith('"') || /[a-zA-Z0-9.,!? ]$/.test(fixed)) {
            if (!fixed.endsWith('"')) fixed += '"';
            for (let i = 0; i < openBraces - closeBraces; i++) fixed += '}';
            for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']';
        }

        try {
            JSON.parse(fixed);
            cleanText = fixed;
            console.log("✅ JSON repair successful");
        } catch (e2) {
            console.warn("JSON repair failed, returning raw text");
        }
    }

    return cleanText;
}

/**
 * Generates a fallback schedule by analyzing the actual calendar text.
 * No hardcoded data — extracts real days and times from user input.
 */
function getFallbackSchedule(compressedText, rawSize, compressedSize) {
    const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
    const lines = compressedText.split(/\n/);

    // Find which days appear in the calendar
    const daysFound = [];
    const busySlots = {};
    let currentDay = null;

    for (const line of lines) {
        const upper = line.trim().toUpperCase();
        for (const day of days) {
            if (upper.startsWith(day)) {
                currentDay = day;
                daysFound.push(day);
                busySlots[day] = [];
                break;
            }
        }
        // Extract time ranges like "09:00 AM - 10:00 AM"
        const timeMatch = line.match(/(\d{1,2}:\d{2}\s*[AP]M)\s*[-–]\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
        if (timeMatch && currentDay) {
            busySlots[currentDay].push({ start: timeMatch[1], end: timeMatch[2] });
        }
    }

    // Find gaps: suggest slots that DON'T overlap busy times
    const schedule = [];
    const possibleSlots = [
        { time: "9:00 AM - 9:30 AM", hour: 9 },
        { time: "11:00 AM - 11:30 AM", hour: 11 },
        { time: "2:00 PM - 2:30 PM", hour: 14 },
        { time: "4:00 PM - 4:30 PM", hour: 16 }
    ];

    // Check each day for free slots
    for (const day of daysFound) {
        if (schedule.length >= 3) break;
        const busy = busySlots[day] || [];

        for (const slot of possibleSlots) {
            if (schedule.length >= 3) break;
            // Check if this slot overlaps any busy time
            const slotHour = slot.hour;
            let isFree = true;
            for (const b of busy) {
                const busyHour = parseInt(b.start);
                const isPM = b.start.toUpperCase().includes("PM") && busyHour !== 12;
                const busyH = isPM ? busyHour + 12 : busyHour;
                if (Math.abs(busyH - slotHour) < 1) {
                    isFree = false;
                    break;
                }
            }
            if (isFree) {
                const ratio = ((1 - compressedSize / rawSize) * 100).toFixed(0);
                schedule.push({
                    title: `Available: ${day.charAt(0) + day.slice(1).toLowerCase()} ${slot.time.split(" - ")[0]}`,
                    date: day.charAt(0) + day.slice(1).toLowerCase(),
                    time: slot.time,
                    duration: 30,
                    reasoning: `Gap found in ${day.toLowerCase()}'s schedule. ${ratio}% compression applied. Add Gemini key for AI analysis.`
                });
                break; // One per day
            }
        }
    }

    // If we couldn't find 3 slots from the data, add remaining from days not in calendar
    const unusedDays = days.filter(d => !daysFound.includes(d));
    for (const day of unusedDays) {
        if (schedule.length >= 3) break;
        schedule.push({
            title: `Available: ${day.charAt(0) + day.slice(1).toLowerCase()} (Open)`,
            date: day.charAt(0) + day.slice(1).toLowerCase(),
            time: "10:00 AM - 10:30 AM",
            duration: 30,
            reasoning: `${day.charAt(0) + day.slice(1).toLowerCase()} has no events in your calendar. Add Gemini key for smarter suggestions.`
        });
    }

    return JSON.stringify(schedule);
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
