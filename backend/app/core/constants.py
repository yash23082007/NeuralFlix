import os

# API Config
API_V1_STR = "/api/v1"
PROJECT_NAME = "NeuralFlix API"

# DB Config
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")

# Recommendation Engine
MAX_RECOMMENDATIONS = 20
DEFAULT_CONFIDENCE_THRESHOLD = 0.5
