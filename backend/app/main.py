import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from .config import SCHEMA_VERSION, CORS_ORIGINS
from .database import get_db, close_client
from .seed import seed_demo
from .routers import auth, vehicles, drivers, rides, requests, demo

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = FastAPI(title="Uttarkashi Taxi Union API", version=str(SCHEMA_VERSION))

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register domain routers under /api prefix
for router in [auth.router, vehicles.router, drivers.router, rides.router, requests.router, demo.router]:
    app.include_router(router, prefix="/api")


@app.get("/api/")
async def root():
    return {"message": "Uttarkashi Taxi Union API", "schema": SCHEMA_VERSION}


@app.on_event("startup")
async def startup_event():
    await seed_demo(get_db())


@app.on_event("shutdown")
async def shutdown_event():
    close_client()
