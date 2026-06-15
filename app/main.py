from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.db.database import engine, Base
from app.api import auth, questions, users, lists, interactions, feeds

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (for development)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(title="AlgoVault API", lifespan=lifespan)

# Allow React app to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(questions.router)
app.include_router(users.router)
app.include_router(lists.router)
app.include_router(interactions.router)
app.include_router(feeds.router)

@app.get("/")
async def root():
    return {"message": "Welcome to AlgoVault API"}
