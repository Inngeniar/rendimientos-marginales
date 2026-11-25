import os
from pathlib import Path
from pydantic import BaseModel


def _default_db_path() -> Path:
    if os.environ.get("VERCEL"):
        return Path("/tmp/rendimientos.db")
    return Path(__file__).resolve().parent.parent / "rendimientos.db"


class Settings(BaseModel):
    app_name: str = "Rendimientos Marginales - Facturación en Salud"
    api_prefix: str = "/api/v1"
    db_path: Path = _default_db_path()
    max_recommended_utilization: float = 0.85


settings = Settings()
