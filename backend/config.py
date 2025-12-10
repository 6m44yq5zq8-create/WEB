"""
Configuration module for the Personal Cloud Storage backend.
Loads environment variables and provides configuration settings.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    """Application settings loaded from environment variables."""
    
    # Server settings
    ROOT_DIRECTORY: Path = Path(os.getenv("ROOT_DIRECTORY", "./files"))
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    
    # Security settings
    ACCESS_PASSWORD: str = os.getenv("ACCESS_PASSWORD", "changeme")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "dev-secret-key-please-change-in-production")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRATION_HOURS: int = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))
    
    # CORS settings
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://49.232.185.68:3000")
    
    # Ensure root directory exists
    def __init__(self):
        self.ROOT_DIRECTORY.mkdir(parents=True, exist_ok=True)

settings = Settings()
