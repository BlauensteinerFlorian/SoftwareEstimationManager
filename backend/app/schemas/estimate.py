# Source: Pydantic v2 docs https://docs.pydantic.dev/latest/concepts/fields/
from typing import Literal
from pydantic import BaseModel, Field

Complexity = Literal["low", "medium", "high", "very_high"]


class EstimateRequest(BaseModel):
    """D-02: Request-Body für POST /api/estimates."""
    pages: int = Field(ge=0, le=10_000, description="Anzahl Pages, 0 ≤ n ≤ 10000 (Phase 1 DoS hardening)")
    complexity: Complexity = Field(description="Pages-Komplexität (kein Default, Pitfall #17)")


class EstimateResponse(BaseModel):
    """D-02: Response-Body für POST /api/estimates."""
    pt: float = Field(description="Berechneter Aufwand in PT (Phase 1: float OK; Phase 2: Decimal)")
