import os
from pathlib import Path

# Base configuration for Google ADK ShoppingAgent
BASE_DIR = Path(__file__).resolve().parent

LEO_API_URL = os.getenv("LEO_API_URL", "http://localhost:3001").rstrip("/")
AGENT_ID = os.getenv("AGENT_ID", "ShoppingAgent-01")
MANDATE_ID = os.getenv("MANDATE_ID", "mnd_amazon_01")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "0.0.0.0")
