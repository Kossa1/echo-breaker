"""Configuration for Echo Breaker backend services."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Project paths
PROJECT_ROOT = Path(__file__).parent.parent
SURVEY_CSV_DIR = PROJECT_ROOT / "survey_res_csv"
SURVEY_CACHE_DIR = PROJECT_ROOT / "survey_cache"

# API Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# LLM Configuration
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")

# Classification settings
CLASSIFICATION_ENABLED = os.getenv("CLASSIFICATION_ENABLED", "true").lower() == "true"

# Validation
def validate_config():
    """Validate required configuration."""
    issues = []

    if CLASSIFICATION_ENABLED and not GEMINI_API_KEY:
        issues.append("GEMINI_API_KEY is required when CLASSIFICATION_ENABLED=true")

    if not SURVEY_CSV_DIR.exists():
        issues.append(f"Survey CSV directory not found: {SURVEY_CSV_DIR}")

    return issues

if __name__ == "__main__":
    issues = validate_config()
    if issues:
        print("Configuration issues:")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("Configuration OK")
