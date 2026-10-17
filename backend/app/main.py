import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import get_settings
from app.database import engine, Base
from app.api.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("blindspot")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info(f"BlindSpot AI Backend starting up in {settings.ENVIRONMENT} mode.")
    yield
    logger.info("Shutting down BlindSpot AI Backend.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="BlindSpot AI: AI-Powered Project Blind Spot Detection Platform",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handler to avoid leaking internal tracebacks
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please check server logs for details."}
    )


# Mount API routes
app.include_router(router, prefix=settings.API_PREFIX)


@app.get("/")
def root():
    return {
        "message": "Welcome to BlindSpot AI Backend",
        "docs": "/docs",
        "health": f"{settings.API_PREFIX}/health"
    }
