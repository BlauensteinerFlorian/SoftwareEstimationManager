# Source: FastAPI tutorial https://fastapi.tiangolo.com/tutorial/body/
from fastapi import APIRouter

from app.schemas.estimate import EstimateRequest, EstimateResponse

router = APIRouter()

# D-03: hardcoded Skeleton-Multiplikatoren — NICHT die Phase-2-Basisgewichte.
# Phase 2 ersetzt diese Map durch weights.json + engine.calculate().
_SKELETON_MULTIPLIER: dict[str, float] = {
    "low": 1.0,
    "medium": 1.5,
    "high": 2.5,
    "very_high": 4.0,
}


@router.post("/estimates", response_model=EstimateResponse)
def create_estimate(req: EstimateRequest) -> EstimateResponse:
    """Skeleton round-trip: pt = pages × multiplier[complexity]."""
    multiplier = _SKELETON_MULTIPLIER[req.complexity]
    pt = req.pages * multiplier
    return EstimateResponse(pt=pt)
