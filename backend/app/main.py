import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.data import get_dataset
from app.routers import coverage, recommendations, stations, statistics
from app.schemas import API_VERSION

API_PREFIX = "/api/v1"


@asynccontextmanager
async def lifespan(_: FastAPI):
    get_dataset()
    yield


app = FastAPI(title="Mobility Citiz API", version=API_VERSION, lifespan=lifespan)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in os.getenv("CORS_ORIGINS", "").split(",") if o],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(coverage.router, prefix=API_PREFIX)
app.include_router(stations.router, prefix=API_PREFIX)
app.include_router(statistics.router, prefix=API_PREFIX)
app.include_router(recommendations.router, prefix=API_PREFIX)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
