# Meeting Scheduler Agent

**Status:** v2.0 (Gemini Integrated)  
**Stack:** Python (FastAPI), HTML/JS, ScaleDown AI (Compression), Google Gemini AI (Intelligence)

## 🚀 Overview
The Meeting Scheduler Agent demonstrates a **Low-Latency Intelligent Scheduling Pipeline**. It solves the problem of processing heavy calendar data by using a two-stage approach:

1.  **Compression Layer (ScaleDown AI)**: Compresses raw, noisy calendar data by up to **90%** while retaining all semantic meaning.
2.  **Intelligence Layer (Gemini AI)**: Uses the efficient compressed context to generate optimal, reasoned meeting times.

**The Pipeline:**
`Raw Data -> [ScaleDown AI] -> Compressed Context -> [Gemini AI] -> Smart Schedule`

## ✨ Key Features

### 1. Two-Stage AI Pipeline
-   **Structure**: Decouples context reduction from reasoning.
-   **Benefit**: Drastically reduces token usage and latency for the reasoning model.
-   **Models**: Supports `Gemini 1.5 Flash`, `1.5 Pro`, and **Custom Model IDs** (e.g., `gemini-2.5-flash`).

### 2. Real-Time Compression Metrics
-   Visualizes input vs. compressed size in real-time.
-   Displays compression ratio and simulated speedup factors.

### 3. Modern UI
-   **Dark/Light Mode**: Fully responsive, theme-aware interface.
-   **Glassmorphism**: Premium look and feel with smooth transitions.
-   **Model Selection**: Dropdown to switch between different Gemini models dynamically.

## 🌍 GitHub Pages (Demo Mode)
This project is ready for **GitHub Pages**.

1.  Go to your repository **Settings** -> **Pages**.
2.  Under **Branch**, select `main` and set the folder to `/` (Root).
3.  Click **Save**.
4.  Your site will be live! (e.g., `https://your-username.github.io/MeetingScheduler/`)
    -   *Note*: In this mode, the Python backend is not running. The site will automatically use a **Client-Side Simulation** mode for demonstration purposes.

## 💻 Setup & Installation (Local Full Version)

### Quick Start (Windows)
1.  **Install**: Double-click included `install.bat` (or run `install.bat` in terminal) to install dependencies.
2.  **Run**: Double-click included `run.bat` (or run `run.bat`) to start the server.
3.  **Use**: Open `http://127.0.0.1:8000` in your browser.

### Manual Installation
1.  Clone the repository:
    ```bash
    git clone <your-repo-url>
    cd MeetingScheduler
    ```
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

### Running the Backend
```bash
python -m uvicorn backend.main:app --reload
```
The server will start at `http://127.0.0.1:8000`.

### Using the App
1.  Open `http://127.0.0.1:8000` in your browser.
2.  Enter your **ScaleDown API Key**.
3.  Enter your **Gemini API Key** (Optional, for Stage 2).
4.  Select your desired Model (e.g., `gemini-1.5-flash`).
5.  Click **"Compress & Optimize"**.

## 📄 License
MIT
