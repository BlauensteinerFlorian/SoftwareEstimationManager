# Source: FastAPI tutorial https://fastapi.tiangolo.com/tutorial/bigger-applications/
import logging
import os
from fastapi import FastAPI

from app import __version__
from app.routers import estimates, health

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger(__name__)

# INFRA-05: read DATABASE_URL from env, default to SQLite local path.
# Phase 1 only LOGS the value; Phase 3 connects to it.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/estimates.db")
log.info("Starting backend v%s — DATABASE_URL=%s (unused in Phase 1)", __version__, DATABASE_URL)

app = FastAPI(
    title="Estimation Manager — Backend",
    version=__version__,
    docs_url="/api/docs",     # OpenAPI-UI unter /api/docs (durch nginx erreichbar)
    openapi_url="/api/openapi.json",
)

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(estimates.router, prefix="/api", tags=["estimates"])

# NO CORS middleware — Same-Origin via nginx reverse-proxy (Pitfall #5/#16).
