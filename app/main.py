from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.db.database import engine, Base
from app.api import questions

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (for development)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Cleanup on shutdown if needed

app = FastAPI(title="CP Curation API", lifespan=lifespan)

app.include_router(questions.router)

@app.get("/")
async def root():
    return {"message": "Welcome to the Competitive Programming Curation API"}
