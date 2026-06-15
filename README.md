# Competitive Programming Curation Platform

A platform for competitive programmers to curate and share DSA problem lists collaboratively. It features a unique ranking system where "saving" a problem acts as a high-value implicit upvote.

## Features
- **URL Hashing**: Prevents duplicate submissions by hashing normalized URLs.
- **Algorithms**: Uses **Hacker News-style Decayed Gravity** for trending feeds, and **Wilson Score Intervals** for all-time best lists.
- **Credibility System**: Weights votes and saves based on the user's tier.
- **Automated User Ratings**: The platform utilizes automated rating calculations based on user handles to establish platform credibility. (Implementation details for these rating syncs are handled internally.)

---

## Folder Structure

The repository is structured into two main components:

### `app/` (Backend)
- `api/`: FastAPI route handlers (`auth.py`, `feed.py`, `lists.py`, `questions.py`, `users.py`).
- `db/`: Database configuration and sessions.
- `models/`: SQLAlchemy ORM database models (`models.py`).
- `schemas/`: Pydantic models for request/response validation.
- `algorithms.py`: Implementations of Wilson Score and Decayed Gravity for problem ranking.
- `gamification.py`: Logic for computing user credibility, curation score, and rank tiers.
- `parsers.py`: Normalization and hashing of competitive programming problem URLs.
- `tasks.py`: Background tasks (e.g., async calculation updates).
- `main.py`: FastAPI application entry point.

### `frontend/` (Frontend)
- `src/components/`: React UI components (Feed, Lists, Profile, Navigation).
- `src/api.js`: Axios configuration and API wrapper functions.
- `src/App.js`: Main application routing.
- `src/index.css`: Global styles and UI themes.

---

## Algorithms & Gamification

**Problem Ranking:**
1. **Wilson Score Interval (All-Time Best):** Calculates the lower bound of a proportion's confidence interval. It balances the ratio of high-weighted interactions (saves) vs total views, ensuring problems with high upvote ratios and large sample sizes appear at the top.
2. **Decayed Gravity (Trending):** `Score / (Age_in_hours + 2)^Gravity`. Prioritizes newly submitted or highly-interactive problems, decaying their relevance smoothly over time.

**User Ranking:**
User ratings are dynamically computed using a combination of algorithm curation behavior and automatically synchronized external coding statistics. Tiers scale from *Scripter* (Base) up to *Grandmaster* (4x credibility multiplier), affecting how much their upvotes and saves alter problem rankings.

---

## Tech Stack
- **Backend:** Python, FastAPI, SQLAlchemy (async), PostgreSQL / SQLite.
- **Frontend:** React, Axios.

---

## Setup & Execution

### 1. Environment Configuration

Both backend and frontend services can be configured using environment variables. Example configuration files (`.env.example`) are provided in their respective directories.

#### Backend Configuration
Create a `.env` file in the **project root directory** (same folder as `README.md`):
```env
# Database connection URL (SQLite is used by default)
DATABASE_URL=sqlite+aiosqlite:///./test.db

# Secret key used for signing JWT auth tokens
SECRET_KEY=algovault-dev-secret-key-change-in-production-2024
```

#### Frontend Configuration
Create a `.env` file in the **`frontend/` directory**:
```env
# Base URL for the backend API
REACT_APP_API_BASE_URL=http://localhost:8000
```

### 2. Database Setup (Optional but recommended)
By default, the API will use an async local SQLite database (`test.db`) for zero-configuration testing.

If you want to use the full PostgreSQL database:
1. Ensure Docker is installed.
2. Run the database via Docker Compose:
   `docker-compose up -d`
3. Update `DATABASE_URL` in your root `.env` file to:
   `DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/cpcuration`

### 3. Run the Backend (FastAPI)
1. Install Python dependencies:
   `pip install -r requirements.txt`
2. Run the FastAPI server:
   `uvicorn app.main:app --reload --port 8000`
   The backend will be available at `http://localhost:8000`. You can view the interactive Swagger docs at `http://localhost:8000/docs`.

### 4. Run the Frontend (React)
1. Open a new terminal.
2. Navigate to the frontend directory:
   `cd frontend`
3. Install dependencies and start:
   `npm install`
   `npm start`
   The frontend will be available at `http://localhost:3000`.
