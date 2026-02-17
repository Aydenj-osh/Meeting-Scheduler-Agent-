import logging
import requests
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ScaleDownService:
    """
    Simulates the ScaleDown AI API service.
    
    This service accepts raw text inputs (Calendar Data, Preferences) and uses
    ScaleDown AI compression to reduce the token count while retaining semantic meaning.
    """

    def compress_text(self, calendar_text: str, preferences_text: str, api_key: Optional[str] = None) -> str:
        """
        Compresses the verbose calendar and preference text into a concise context prompt using the real ScaleDown API.
        """
        if not api_key:
            logger.warning("ScaleDown: No API Key provided. Returning Simulated Compression.")
            return self._simulate_compression(calendar_text, preferences_text)

        # explicit check for safety/linter
        safe_key = api_key if api_key else "xxxx"
        logger.info(f"ScaleDown: Authenticated with User API Key ending in ...{safe_key[-4:]}")
        logger.info("ScaleDown: Sending request to real API endpoint...")

        try:
            # User verified endpoint
            url = "https://api.scaledown.xyz/compress/raw/" 
            
            headers = {
                "x-api-key": api_key,
                "Content-Type": "application/json"
            }
            
            # Construct payload matching the documentation
            # Context = Calendar Data (The "Background Answer")
            # Prompt = Preferences (The "Query")
            payload = {
                "context": calendar_text,
                "prompt": f"Based on the context, schedule a meeting with these constraints: {preferences_text}",
                "model": "gpt-4o", # Default model as per docs
                "scaledown": {
                    "rate": "auto"
                }
            }

            logger.info(f"ScaleDown: Sending request to {url}...")
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                # Extract compressed text from the nested 'results' key as seen in the debug output
                results = data.get("results", {})
                compressed_content = results.get("compressed_prompt")
                
                # Fallback: try top-level if not in results (just in case)
                if not compressed_content:
                    compressed_content = data.get("compressed_prompt")

                if not compressed_content:
                     logger.warning(f"ScaleDown: 'compressed_prompt' key missing. Keys found: {data.keys()}")
                     # Fallback check for other keys just in case docs are slightly off
                     compressed_content = data.get("compressed_text") or data.get("text") or str(data)
                
                # Calculate reduction stats
                original_len = len(calendar_text) + len(preferences_text)
                compressed_len = len(compressed_content)
                reduction = (1 - (compressed_len / original_len)) * 100 if original_len > 0 else 0
                
                logger.info(f"ScaleDown Success: {original_len} -> {compressed_len} chars ({reduction:.2f}% reduction)")
                return compressed_content
            else:
                logger.error(f"ScaleDown API Error: {response.status_code} - {response.text}")
                return f"ERROR: ScaleDown API failed with status {response.status_code}. Details: {response.text}"

        except Exception as e:
            logger.error(f"ScaleDown Connection Error: {str(e)}")
            return f"ERROR: ScaleDown Connection Failed: {str(e)}"

    def _simulate_compression(self, calendar_text: str, preferences_text: str) -> str:
        """
        Fallback simulation logic (kept for demo purposes if no key).
        """
        compressed_lines = []
        compressed_lines.append("CONTEXT: OPTIMIZE SCHEDULE")
        
        # Process Calendar Text
        lines = calendar_text.split('\n')
        for line in lines:
            # aggressive pruning of noise
            if any(x in line for x in ["PRODID", "VERSION", "CALNAME", "TIMEZONE", "UID", "STATUS", "html", "<", ">", "http"]):
                continue
            
            # Remove long descriptions entirely as they are usually noise for scheduling
            if line.startswith("DESCRIPTION:"):
                continue

            if "start" in line.lower() or "end" in line.lower() or "summary" in line.lower() or "location" in line.lower():
                # clean up the line
                # Fixed invalid escape sequence warning by using raw string or double backslash if needed, 
                # but simple replace is fine.
                clean_line = line.strip().replace('"', '').replace('\\,', ',')
                compressed_lines.append(clean_line)

        # Process Preferences
        compressed_lines.append("CONSTRAINTS:")
        
        # Safe slicing
        limit = 200
        truncated_prefs = preferences_text[:limit] + "..." if len(preferences_text) > limit else preferences_text
        compressed_lines.append(truncated_prefs)

        return "\n".join(compressed_lines)
