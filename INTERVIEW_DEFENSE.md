# AlgoVault — Interview Defense Guide

> **For the interviewer:** This is a CP (Competitive Programming) problem curation platform. Users submit links to problems from Codeforces, LeetCode, AtCoder, and CSES. The community upvotes and saves them. A rank-weighted scoring engine drives two feeds: a time-decayed "Trending" feed and a confidence-interval-based "Hall of Fame" feed. Users also earn gamified rank tiers (Scripter → Grandmaster) based on their solving stats and curation activity.

---

## 1. The 10-Minute Pitch (STAR Format)

### Situation
Competitive programmers face a fragmented discovery problem. Problems worth practicing are scattered across Codeforces, LeetCode, AtCoder, and CSES with no cross-platform curation layer. Existing communities (Discord, Reddit) surface recommendations through noisy, ephemeral discussions with no signal about *lasting* quality.

### Task
Build a full-stack community curation platform where the signal from *who* interacts matters as much as *how many* interact — a Grandmaster's save should carry more weight than a beginner's upvote.

### Action
- Designed a **FastAPI + async SQLAlchemy** backend with six API routers (auth, questions, users, lists, interactions, feeds).
- Implemented a **rank-weighted interaction engine**: every upvote and save carries a `weight_applied = base_weight × rank_multiplier`, where rank multipliers range from 1.0× (Scripter) to 4.0× (Grandmaster).
- Built **two mathematically distinct ranking signals**:
  - `trending_score`: Hacker News–style gravity decay `(score+1) / (age_hours+2)^1.8`
  - `wilson_score`: Wilson score confidence interval treating each view as a "trial" and weighted interactions as "successes"
- Implemented a **gamification engine** that combines a `solving_score` (weighted across CF/LC/AC/CSES ratings, max 1500) with a `curation_score` (submissions + interactions received + forks of your lists, max 1500) to assign 7 rank tiers.
- Built a **React 19 SPA** with two live feeds, tag-based filtering, list management with fork-and-clone, and a profile page with external stats sync.
- Wrote **async proxy endpoints** that scrape Codeforces API, LeetCode GraphQL, AtCoder HTML, and CSES HTML to sync user ratings server-side.

### Result
A deployed, working platform (Vercel frontend + FastAPI backend) with:
- Sub-millisecond score recalculation on every interaction (scores computed in-process, not via a cron job)
- URL deduplication via platform-specific parsers + SHA-256 hashing, preventing the same problem from being submitted twice regardless of URL variant
- Background task queue for rank recalculation so API responses are never blocked by score recomputation
- Full test suite covering auth, gamification, list forking, and feed endpoints using `pytest-asyncio` + `httpx` in-process ASGI transport

---

## 2. Architecture & Data Flow

### Stack Overview
```
React 19 SPA (Vercel)
     │  axios + interceptors (Bearer JWT)
     ▼
FastAPI (Uvicorn, async)
     │
     ├── app/api/auth.py        → /auth/*
     ├── app/api/questions.py   → /questions/*
     ├── app/api/users.py       → /users/*
     ├── app/api/lists.py       → /lists/*
     ├── app/api/interactions.py→ /interactions/*
     └── app/api/feeds.py       → /feed/*
           │
     SQLAlchemy (async) + asyncpg (prod) / aiosqlite (dev/test)
           │
     PostgreSQL (prod) / SQLite (dev)
```

### Entry Point
`app/main.py` — creates the FastAPI app, registers CORS origins (including `algo-vault-nu.vercel.app`), and mounts all six routers. On startup, the `lifespan` context manager calls `Base.metadata.create_all` to auto-create tables.

### End-to-End Data Flow: Submitting a Problem

1. **Frontend** (`SubmitPage.js`): user pastes a URL → calls `GET /questions/parse-title?url=...`
2. **Backend** (`questions.py:parse_title`): detects platform via `auto_detect_platform()` in `parsers.py`, then tries to scrape the `<title>` tag from the problem page using `httpx` (with Cloudflare detection fallback, then slug-based fallback).
3. User confirms title → `POST /questions/` with `{url, title, platform?}`.
4. `create_question` calls `normalize_and_hash_url()` (`utils.py`) → `ParserFactory.get_parser(platform).parse(url)` → `hashlib.sha256(canonical_url)` → checks for duplicate hash in DB.
5. If new: inserts `Question` row with `trending_score=0`, `wilson_score=0`. Fires `background_tasks.add_task(background_update_user_rank, user.id)`.
6. **Background task** (`tasks.py`): opens a fresh `AsyncSessionLocal`, calls `update_user_rank()` in `gamification.py`, which recomputes `solving_score + curation_score → total_rating → rank_tier` and commits.

### End-to-End Data Flow: Upvoting a Problem

1. Frontend (`QuestionCard.js:handleUpvote`): calls `POST /interactions/` with `{question_id, interaction_type: "Upvote"}`.
2. `interactions.py:create_interaction`:
   - Fetches question, checks for duplicate interaction (unique constraint on `user_id + question_id + interaction_type`).
   - Computes `applied_weight = WEIGHT_UPVOTE(1.0) × get_weight_multiplier_for_rank(user.rank_tier)`.
   - Inserts `Interaction` row, increments `question.total_views`, adds `applied_weight` to `question.total_weighted_score`.
   - **Recalculates both scores inline** (same request): `wilson_score = calculate_wilson_score(...)` and `trending_score = calculate_decayed_gravity(...)`.
   - Commits. Fires background task to update the *submitter's* curation rank.
3. Frontend uses **optimistic updates** — state flips immediately, reverts on error.

### Feed Data Flow: Trending / Hall of Fame

1. Frontend (`FeedContainer.js:fetchFeed`): calls `GET /feed/trending?topic_tags[]=...&difficulty=...`
2. `feeds.py:_fetch_filtered`:
   - If filters present: fetches `limit × 10` rows ordered by `trending_score DESC`, then filters in Python (SQLite has no JSON array indexing).
   - If no filters: fetches exactly `limit` rows.
3. `_enrich_questions`: for each question, fetches the submitter's username + the current user's interaction state (batched per feed call, not per card). Returns `QuestionResponse` objects with `has_upvoted`, `has_saved`, `has_solved` flags.

### External API Flow: Rating Sync

`PUT /users/me/stats` with only handle fields → triggers `background_sync_ratings` → `rating_sync.py:sync_user_ratings` runs four fetches **concurrently** via `asyncio.gather()`:
- Codeforces: `GET https://codeforces.com/api/user.info?handles={handle}` (official JSON API)
- LeetCode: `POST https://leetcode.com/graphql` (GraphQL query for `acSubmissionNum`)
- AtCoder: `GET https://atcoder.jp/users/{handle}` (HTML scrape with regex)
- CSES: `GET https://cses.fi/user/{handle}` (HTML scrape with regex)

---

## 3. Design Choices & Trade-offs

### FastAPI (Python async) vs. alternatives

**Why FastAPI:**
- Native `async/await` with `asyncpg` gives true non-blocking I/O — critical because the rating sync path makes 4 concurrent external HTTP calls. A synchronous Django/Flask would block an entire thread per user stat update.
- Automatic OpenAPI docs from Pydantic schemas — zero extra work.
- `BackgroundTasks` is built-in, making it trivial to offload rank recalculation without a separate message broker.

**Trade-offs:**
- Python's GIL means CPU-bound work is still serialized per process. The scoring math (Wilson, gravity) is simple enough that this doesn't matter, but it would at scale.
- `BackgroundTasks` runs in the *same process* as the request handler. If the server restarts mid-task, the rank update is silently lost.

**Alternatives rejected:**
- **Node.js/Express**: Would have been equally async but loses Pydantic's data validation and type safety. Python's scientific math libraries are also more natural for the scoring formulas.
- **Go**: Better raw throughput, but the codebase would be 3× longer, and the rating scraping logic (regex, httpx) is much faster to write in Python.

---

### SQLAlchemy Async vs. raw asyncpg or an ORM like Tortoise

**Why SQLAlchemy:**
- `async_sessionmaker` + `AsyncSession` gives us a proper Unit of Work pattern. The `expire_on_commit=False` setting is intentional — after committing an interaction, we need the `Interaction` object's fields without re-querying.
- Dual-database support: the same ORM models work with `sqlite+aiosqlite` in dev/test and `postgresql+asyncpg` in production. The `database.py` URL-rewriting logic handles the driver prefix swap automatically.
- `UniqueConstraint('user_id', 'question_id', 'interaction_type')` on `Interaction` is enforced at the DB level, not just application level — safe even under concurrent requests.

**Trade-offs:**
- ORM adds query overhead vs. raw SQL. The N+1 problem is visible in `_enrich_questions` — a username lookup is done **per question** in a loop (one extra `SELECT` per card).
- The `statement_cache_size=0` setting for asyncpg is required when using pgBouncer (session pooler), which disables prepared statement caching and adds slight overhead per query.

**Alternative:** Tortoise ORM is simpler but has fewer escape hatches to raw SQL. SQLAlchemy Core's `text()` would be the right upgrade path for hotspot queries.

---

### Wilson Score vs. Simple Upvote Count

**Why Wilson Score:**
- A problem with 2 saves out of 2 views is not necessarily better than one with 95 saves out of 100 views. Wilson score computes the **lower bound of a 95% confidence interval** for the true approval rate (z=1.96), so it naturally penalizes low-sample questions.
- The "trial" is a view (a user saw this question), and the "success" is a weighted interaction score. This reframes the problem as a Bayesian estimation problem, not a raw count race.

**Why Gravity Decay for Trending:**
- Directly inspired by Hacker News's formula: `score / (age+2)^gravity`. The `+2` prevents division by zero on brand-new posts and gives a 2-hour head start. A gravity of 1.8 decays faster than HN's 1.8 — older problems fall off the trending feed aggressively.

**Trade-off:** Both scores are computed **synchronously on every interaction write** and stored as columns on the `questions` table. This avoids expensive real-time computation on reads but means scores are slightly stale between interactions (a deleted upvote does update scores immediately via the DELETE endpoint).

---

### Rank-Weighted Interactions

**Why this matters:** It prevents "Sybil gaming" where a user creates 1000 beginner accounts to upvote their own submissions. A Grandmaster (4.0×) upvote is worth 4 regular upvotes for `total_weighted_score`, and this feeds directly into Wilson score calculation.

**The weight ladder:**
| Tier | Multiplier |
|---|---|
| Scripter | 1.0× |
| Explorer | 1.2× |
| Curator | 1.5× |
| Architect | 2.0× |
| Algorithmist | 2.5× |
| Master | 3.0× |
| Grandmaster | 4.0× |

**Trade-off:** When a user's rank increases, their **past** interactions are not retroactively reweighted. The `weight_applied` column on `Interaction` stores the weight at the *time* of interaction — a historical snapshot. This is a deliberate, pragmatic design choice but means scores don't fully reflect current community composition.

---

### JWT Authentication (stateless) vs. Sessions

**Why JWT:**
- Stateless — no session store needed. The React SPA stores the token in `localStorage` and the axios interceptor attaches it to every request.
- 24-hour expiry (`ACCESS_TOKEN_EXPIRE_MINUTES = 1440`).
- `get_optional_current_user` allows anonymous feed reads (no auth required for `/feed/trending`).

**Trade-off:** Tokens cannot be invalidated server-side before expiry (no blacklist). This is acceptable for a CP platform with no sensitive financial data, but would be a security problem for a banking app.

---

### URL Deduplication via SHA-256 Hash

`utils.py:normalize_and_hash_url` — platform-specific parsers canonicalize the URL first:
- `https://codeforces.com/contest/1/problem/A` → `codeforces.com/problemset/problem/1/A`
- `https://leetcode.com/problems/two-sum/description/` → `leetcode.com/problems/two-sum`

Then SHA-256 of the canonical string is stored as `normalized_url_hash` (unique index). This means the same problem submitted with different URL variants (with/without trailing slash, contest vs. problemset URL) is correctly deduplicated.

**Trade-off:** SHA-256 is collision-resistant but not collision-proof. In practice, for a problem curation platform with millions of problems, this risk is astronomically low. The alternative (storing canonical URLs and doing string comparison) would require careful collation and trailing-slash normalization at query time.

---

## 4. Dependency Audit

### Backend

| Library | Role | How it works under the hood |
|---|---|---|
| **FastAPI** | Web framework | Built on Starlette (ASGI). Routes are decorated coroutines. Pydantic v2 handles request body parsing/validation via Rust-based `pydantic-core`. Dependency Injection via `Depends()` builds a DAG of async callables resolved per request. |
| **Uvicorn** | ASGI server | Event-loop based server (uses `uvloop` in `[standard]` install for 2-4× speedup over asyncio default). Handles HTTP/1.1, WebSocket, and lifespan protocol. |
| **SQLAlchemy (async)** | ORM + query builder | `create_async_engine` wraps an async driver (asyncpg or aiosqlite) in an event-loop-compatible engine. `AsyncSession` uses `asyncio.Lock` to ensure thread safety. The Unit of Work pattern tracks object state (pending/persistent/detached) in an `IdentityMap`. |
| **asyncpg** | PostgreSQL driver (prod) | Pure Python + Cython async driver. Speaks the PostgreSQL wire protocol directly (no libpq). Uses prepared statements by default (disabled here via `statement_cache_size=0` for pgBouncer compatibility). |
| **aiosqlite** | SQLite driver (dev/test) | Wraps synchronous `sqlite3` in a background thread with an async queue, simulating non-blocking I/O. |
| **Pydantic v2** | Data validation | Generates JSON Schema from Python type annotations. `model_config = ConfigDict(from_attributes=True)` enables ORM mode — reads attributes from SQLAlchemy model instances instead of dicts. |
| **python-jose** | JWT encode/decode | Implements RFC 7519. Uses HS256 (HMAC-SHA256) — symmetric signing. The `SECRET_KEY` must be kept server-side only. |
| **passlib[bcrypt]** | Password hashing | bcrypt is a slow, adaptive hash (cost factor adjustable). Slow by design — makes brute-force attacks computationally expensive. |
| **httpx** | Async HTTP client | Used for external API calls (rating sync, title scraping). Supports `follow_redirects=True` and async context manager API. |
| **alembic** | DB migrations | Generates migration scripts by diffing SQLAlchemy metadata against the actual DB schema. Used for production schema changes; dev uses `create_all`. |

### Frontend

| Library | Role | How it works under the hood |
|---|---|---|
| **React 19** | UI framework | Concurrent rendering with `useTransition` and the new compiler. Virtual DOM diffing via fiber reconciler. `useState` triggers re-render scheduling, not synchronous updates. |
| **React Router v7** | Client-side routing | Uses the HTML5 History API (`pushState`) to change URLs without page reloads. `<Routes>` does pattern matching in order. |
| **axios** | HTTP client | Promise-based XMLHttpRequest wrapper. **Interceptors** are the key pattern here: `request interceptor` reads JWT from `localStorage` and injects `Authorization: Bearer ...` header on every outgoing request; `response interceptor` catches 401s and redirects to `/login`. |
| **lucide-react** | Icons | SVG icon components, tree-shakeable (only imported icons are bundled). |

---

## 5. The "Alternate Reality" — Scaling Bottlenecks

### If traffic suddenly hits 100× current volume, here is what breaks first, in order:

---

#### 🔴 Bottleneck #1: `_enrich_questions` — The N+1 Query Problem
**File:** `app/api/feeds.py:_enrich_questions` (lines 37–67)

**Current code:**
```python
for q in questions:
    user_result = await db.execute(select(User.username).filter(User.id == q.submitter_id))
```
For a feed of 20 questions, this fires **20 separate `SELECT` queries** to fetch usernames. At 100× load, with 50 concurrent feed requests, you're looking at 1,000 username queries per second just for feed rendering.

**Fix:** Replace with a single JOIN or a batch `IN` query:
```python
submitter_ids = [q.submitter_id for q in questions]
user_map_result = await db.execute(
    select(User.id, User.username).filter(User.id.in_(submitter_ids))
)
user_map = {row.id: row.username for row in user_map_result}
```
This reduces 20 queries to 1.

---

#### 🔴 Bottleneck #2: Post-fetch Python Tag Filtering
**File:** `app/api/feeds.py:_fetch_filtered` (lines 75–90)

**Current code:**
```python
fetch_limit = limit * 10 if (topic_tags or ...) else limit
result = await db.execute(select(Question).order_by(...).limit(fetch_limit))
questions = result.scalars().all()
# Then filter in Python
```
When filters are active, the backend fetches `limit × 10 = 200` rows from the database, loads them all into Python memory, then discards most of them. At 100× traffic with active filters, this is 200 full `Question` ORM objects per request, loaded and thrown away.

**Root cause:** `topic_tags` and `technique_tags` are stored as JSON columns. SQLite has no JSON array operators, so Python filtering was used as a workaround.

**Fix (Production):** Switch to PostgreSQL's `@>` (contains) operator with a `GIN` index:
```sql
-- Migration
ALTER TABLE questions ADD COLUMN topic_tags_arr TEXT[];
CREATE INDEX idx_topic_tags_gin ON questions USING GIN(topic_tags_arr);
```
```python
# Query
stmt = select(Question).where(Question.topic_tags_arr.overlap(topic_tags))
```
This moves filtering into the DB with index support, eliminating the over-fetch entirely.

**Fix (Interim, SQLite):** Use `JSON_EACH` in a raw SQL query:
```python
from sqlalchemy import text
stmt = text("SELECT * FROM questions WHERE EXISTS (SELECT 1 FROM json_each(topic_tags) WHERE value IN :tags)")
```

---

#### 🟡 Bottleneck #3: Inline Score Recalculation on Every Interaction Write
**File:** `app/api/interactions.py:create_interaction` (lines 46–53)

Every upvote/save/delete recalculates `wilson_score` and `trending_score` synchronously as part of the same DB transaction. At scale:
- A viral problem getting 1,000 simultaneous upvotes would generate 1,000 concurrent `UPDATE questions SET wilson_score=..., trending_score=...` statements on the same row.
- This creates **lock contention** on that single `questions` row in PostgreSQL.

**Fix:** Decouple score recalculation from the interaction write. Use a debounced background job:
1. Write the `Interaction` row and increment `total_weighted_score` atomically with `UPDATE questions SET total_weighted_score = total_weighted_score + :weight` (atomic DB increment, no lock race).
2. Enqueue a score recalculation job to a message queue (Celery + Redis, or pg_cron).
3. A worker periodically (e.g., every 60s) recomputes `wilson_score` and `trending_score` for recently active questions and bulk-updates them.

---

#### 🟡 Bottleneck #4: `BackgroundTasks` — In-Process, No Persistence
**File:** `app/tasks.py`

FastAPI's `BackgroundTasks` runs coroutines in the same event loop as the request. Problems at scale:
- If the server is restarted (deploy, crash), in-flight rank recalculations are **silently dropped**. A user's rank may be stale indefinitely.
- If the event loop is saturated (100× traffic), background tasks queue up in memory and are never garbage-collected until they run — a memory leak vector.

**Fix:** Move to a proper task queue. **Celery + Redis** is the production standard:
```python
# tasks.py (new)
from celery import Celery
app = Celery('algovault', broker='redis://localhost:6379/0')

@app.task
def update_user_rank_task(user_id: str):
    # synchronous DB access via a regular session
    ...
```
Tasks are persisted in Redis. If the worker dies, the task stays in the queue and retries on restart. This also enables horizontal scaling — run N worker processes independently of the API servers.

---

#### 🟡 Bottleneck #5: External Rating Sync — No Caching, No Rate-Limit Protection
**File:** `app/services/rating_sync.py`

`sync_user_ratings` fires 4 concurrent external HTTP requests (CF, LC, AC, CSES) every time a user updates their handles. At 100× traffic:
- If 1,000 users update stats simultaneously, you send 4,000 external HTTP requests. Codeforces will rate-limit/ban the server IP.
- If any external service is slow (AtCoder, CSES scraping), the background task hangs for up to 10 seconds, holding an `AsyncSession` open.

**Fix:** Add a **cooldown check** before syncing:
```python
# In rating_sync.py
SYNC_COOLDOWN_HOURS = 6
if user.last_rating_update and (now - user.last_rating_update).total_seconds() < SYNC_COOLDOWN_HOURS * 3600:
    return False  # Skip sync, too recent
```
**Fix (Scale):** Move sync to a scheduled Celery beat task (e.g., nightly batch update for all users with handles), not a per-request trigger.

---

#### 🟢 Already Well-Designed (Will Scale)

- **URL deduplication via SHA-256 hash + unique index**: Hash lookups are O(1) and indexed. This will not be a bottleneck.
- **JWT auth (stateless)**: No session store to query on every request. This scales horizontally with zero coordination.
- **Dual-database URL rewriting** (`database.py`): The dev/prod database swap is transparent to all application code.
- **Optimistic UI updates** in `QuestionCard.js`: Upvote/save state flips immediately in the browser without waiting for the server — perceived latency is near-zero regardless of backend speed.
- **Axios interceptors** in `api.js`: The 401 → redirect and token injection are centralized. Adding a new API call never requires repeating auth logic.

---

## 6. Known Active Bugs (For Your Awareness)

### Bug 1: Filter Latency (Click-to-Response Delay)
**Root cause (as analyzed):** When any filter is active, `_fetch_filtered` fetches `limit × 10 = 200` full ORM objects from the database, then discards most of them in Python. This is the primary source of perceived lag between clicking a filter and seeing results.

**Additionally:** Each feed response triggers `_enrich_questions`, which fires N username lookups in a loop. For 20 results, that's 20 extra sequential DB round-trips before the response is returned.

**Combined effect:** Filter click → 200-row DB fetch → Python filter → ~20 sequential username SELECTs → response. This adds up to 200–500ms of server-side latency on a lightly loaded SQLite instance, perceived as "slow" in the UI.

**Fix path (immediate):** Batch the username lookups (single IN query). **Fix path (proper):** Move JSON filtering to the database layer as described in Bottleneck #2.

### Bug 2: Filters Not Working in Trending / Hall of Fame
**Root cause:** The filter parameters are passed correctly from `api.js` to the backend (`params.topic_tags = filters.topic_tags`), and the backend's `_fetch_filtered` does filter in Python. The likely cause is one of two things:

1. **The questions in the DB have `topic_tags = null`** (questions submitted before tags were added have `NULL` JSON columns). The filter guard `if q.topic_tags and any(t in q.topic_tags for t in topic_tags)` correctly skips null-tagged questions — but if most/all questions have null tags, the result set is empty, making it look like filters don't work.

2. **The `fetch_limit` over-fetch is insufficient**: `limit × 10 = 200` rows are fetched, but if the DB has fewer than 200 questions with matching tags, the slice `questions[skip: skip+limit]` returns fewer than expected.

**Verification:** Check if questions in the DB actually have `topic_tags` set (run `SELECT id, topic_tags FROM questions LIMIT 10` on `test.db`). If all are null, the filters are "working" but finding nothing — the UI needs to show a message like "No tagged questions found. Tag your submitted problems to enable filtering."

---

## 7. Quick-Reference Cheat Sheet for Interviewers

| Question | Answer |
|---|---|
| What is the entry point? | `app/main.py` — mounts 6 routers, lifespan creates DB tables |
| How are passwords stored? | bcrypt hash via `passlib` — adaptive cost factor |
| How are JWTs issued? | HS256, 24h expiry, `sub` = user UUID |
| How is duplicate problem detection done? | Platform-aware URL canonicalization → SHA-256 → unique DB index |
| How is trending calculated? | `(score+1) / (age_hours+2)^1.8` — stored on question row |
| How is "best of all time" calculated? | Wilson score confidence interval (z=1.96), stored on question row |
| Why do high-ranked users have more influence? | `weight_applied = base_weight × rank_multiplier` (1.0×–4.0×) |
| How is rank tier calculated? | `solving_score(max 1500) + curation_score(max 1500) → thresholds` |
| How are external ratings fetched? | `asyncio.gather()` — 4 concurrent httpx calls (CF JSON API, LC GraphQL, AC/CSES HTML scrape) |
| How are background tasks handled? | FastAPI `BackgroundTasks` (same process, no persistence) |
| What is the test strategy? | `pytest-asyncio` + `httpx ASGITransport` — in-process, no real HTTP, isolated SQLite DB |
| What is the biggest scaling risk? | N+1 username queries + Python-side tag filtering |
