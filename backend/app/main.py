import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import coverage, recommendations, stations

API_PREFIX = "/api/v1"

app = FastAPI(title="Mobility Citiz API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in os.getenv("CORS_ORIGINS", "").split(",") if o],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(coverage.router, prefix=API_PREFIX)
app.include_router(stations.router, prefix=API_PREFIX)
app.include_router(recommendations.router, prefix=API_PREFIX)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
