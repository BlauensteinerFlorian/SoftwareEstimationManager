# Source: FastAPI docs https://fastapi.tiangolo.com/reference/apirouter/
from datetime import datetime, timezone
from fastapi import APIRouter

from app import __version__

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    """D-06: 200 OK mit status, version, timestamp (ISO-8601 UTC)."""
    return {
        "status": "ok",
        "version": __version__,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
