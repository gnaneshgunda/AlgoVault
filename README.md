# Competitive Programming Curation Platform

A platform for competitive programmers to curate and share DSA problem lists collaboratively. It features a unique ranking system where "saving" a problem acts as a high-value implicit upvote.

## Features
- **URL Hashing**: Prevents duplicate submissions by hashing normalized URLs.
- **Algorithms**: Uses Hacker News-style Decayed Gravity for trending feeds, and Wilson Score Intervals for all-time best lists.
- **Credibility System**: Weights votes and saves based on the user's tier.

---

## Tech Stack
- **Backend:** Python, FastAPI, SQLAlchemy (async), PostgreSQL / SQLite.
- **Frontend:** React, Axios.

---

## Getting Started

### 1. Database Setup (Optional but recommended)
By default, the API will use an async local SQLite database (`test.db`) for zero-configuration testing.

If you want to use the full PostgreSQL database:
1. Ensure Docker is installed.
2. Run the database via Docker Compose:
   `docker-compose up -d`
3. Create a `.env` file in the root directory and add the PostgreSQL URL:
   `DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/cpcuration`

### 2. Run the Backend (FastAPI)
1. Install Python dependencies:
   `pip install -r requirements.txt`
2. Run the FastAPI server:
   `uvicorn app.main:app --reload --port 8000`
   The backend will be available at `http://localhost:8000`. You can view the interactive Swagger docs at `http://localhost:8000/docs`.

### 3. Run the Frontend (React)
1. Open a new terminal.
2. Navigate to the frontend directory:
   `cd frontend`
3. Install dependencies and start:
   `npm install`
   `npm start`
   The frontend will be available at `http://localhost:3000`.
