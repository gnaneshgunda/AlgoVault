import httpx
from datetime import datetime, timezone
import asyncio

async def fetch_codeforces_rating(handle: str) -> int:
    if not handle:
        return 0
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"https://codeforces.com/api/user.info?handles={handle}", timeout=5.0)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "OK" and len(data["result"]) > 0:
                    return data["result"][0].get("rating", 0)
    except Exception:
        pass
    return 0

async def fetch_leetcode_solved(handle: str) -> int:
    if not handle:
        return 0
    try:
        async with httpx.AsyncClient() as client:
            query = """
            query getUserProfile($username: String!) {
              matchedUser(username: $username) {
                submitStats {
                  acSubmissionNum {
                    difficulty
                    count
                  }
                }
              }
            }
            """
            resp = await client.post("https://leetcode.com/graphql", json={
                "query": query,
                "variables": {"username": handle}
            }, timeout=5.0)
            if resp.status_code == 200:
                data = resp.json()
                if "data" in data and data["data"]["matchedUser"]:
                    stats = data["data"]["matchedUser"]["submitStats"]["acSubmissionNum"]
                    for stat in stats:
                        if stat["difficulty"] == "All":
                            return stat["count"]
    except Exception:
        pass
    return 0

# Dummy placeholders for atcoder and cses since their APIs are harder to scrape directly without proper endpoints
async def fetch_atcoder_rating(handle: str) -> int:
    if not handle:
        return 0
    # In a real scenario, scrape AtCoder profile or use an unofficial API.
    return 0

async def fetch_cses_solved(handle: str) -> int:
    if not handle:
        return 0
    # In a real scenario, scrape CSES profile.
    return 0

async def sync_user_ratings(user):
    cf_rating, lc_solved, ac_rating, cses_solved = await asyncio.gather(
        fetch_codeforces_rating(user.cf_handle),
        fetch_leetcode_solved(user.lc_handle),
        fetch_atcoder_rating(user.ac_handle),
        fetch_cses_solved(user.cses_handle)
    )

    updated = False
    if user.cf_handle and cf_rating > 0:
        user.codeforces_rating = cf_rating
        updated = True
    if user.lc_handle and lc_solved > 0:
        user.leetcode_solved = lc_solved
        updated = True
    if user.ac_handle and ac_rating > 0:
        user.atcoder_rating = ac_rating
        updated = True
    if user.cses_handle and cses_solved > 0:
        user.cses_solved = cses_solved
        updated = True

    user.last_rating_update = datetime.now(timezone.utc)
    return updated
