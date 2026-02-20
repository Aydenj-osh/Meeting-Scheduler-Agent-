import warnings
warnings.filterwarnings("ignore", category=FutureWarning, module="google")

import time
import logging
import google.generativeai as genai

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GeminiService:
    """
    Handles generation of schedules using Google's Gemini API.
    Fallback to simulation if no API key is provided.
    """

    def __init__(self, processing_speed_ms_per_char=0.5):
        self.speed = processing_speed_ms_per_char  # For simulation only

    def generate_schedule(self, prompt: str, api_key: str = None, model_name: str = "gemini-2.5-flash") -> str:
        """
        Generates a schedule based on the prompt using Gemini.
        Raises an error if no API key is provided.
        """
        if not api_key or not api_key.strip():
            raise ValueError("Gemini API Key is missing. Please provide a valid key.")
            
        return self._generate_with_gemini(prompt, api_key, model_name)

    def _generate_with_gemini(self, prompt: str, api_key: str, model_name: str) -> str:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(model_name)
            
            # Enhancing the prompt for better scheduling output
            enhanced_prompt = f"""
            You are an expert meeting scheduler. 
            Based on the following compressed context and preferences, propose 3 optimal meeting times.
            
            CONTEXT:
            {prompt}
            
            OUTPUT FORMAT (JSON ONLY):
            Return a valid JSON array with exactly 3 meeting options. Each option must have:
            - "title": Brief descriptive title
            - "date": Date in format "Day, Month DD"
            - "time": Time range (e.g., "10:00 AM - 11:00 AM")
            - "duration": Duration in minutes
            - "reasoning": Why this slot is optimal
            
            Example:
            [
              {{
                "title": "Morning Focus Slot",
                "date": "Thursday, October 31st",
                "time": "10:30 AM - 11:00 AM",
                "duration": 30,
                "reasoning": "Clear 30-minute window between meetings, avoids deep work blocks."
              }}
            ]
            
            Return ONLY the JSON array, no markdown formatting, no explanations.
            """
            
            response = model.generate_content(enhanced_prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini API Error: {str(e)}")
            
            # DEBUG: List available models to help user find the right name
            try:
                logger.info("--- AVAILABLE MODELS FOR THIS KEY ---")
                for m in genai.list_models():
                    if 'generateContent' in m.supported_generation_methods:
                        logger.info(f"Model: {m.name}")
                logger.info("-------------------------------------")
            except Exception as listing_error:
                logger.error(f"Could not list models: {listing_error}")

            raise Exception(f"Error with model '{model_name}': {str(e)}")
