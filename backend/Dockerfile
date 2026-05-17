# Source: https://docs.astral.sh/uv/guides/integration/docker/
# Build-Stage: deps installieren via uv
FROM python:3.12-slim-bookworm AS builder
COPY --from=ghcr.io/astral-sh/uv:0.11.14 /uv /uvx /bin/

WORKDIR /app

# Layer-Caching: erst Lock + Manifest, dann Code
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-workspace

COPY pyproject.toml uv.lock /app/
COPY app /app/app

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-editable

# Runtime-Stage: nur Venv + App
FROM python:3.12-slim-bookworm

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/app /app/app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# INFRA-04: nur expose (Compose-intern), kein Host-Port-Mapping in compose
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
