import httpx
from datetime import datetime, timezone
import asyncio
import logging

logger = logging.getLogger(__name__)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}

async def fetch_codeforces_rating(handle: str) -> tuple[int, bool]:
    if not handle:
        return 0, True
    handle = handle.lstrip('@').strip()
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://codeforces.com/api/user.info?handles={handle}",
                headers=HEADERS,
                timeout=10.0
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "OK" and len(data["result"]) > 0:
                    return data["result"][0].get("rating", 0), True
            elif resp.status_code == 400:
                logger.warning(f"Codeforces handle not found: {handle}")
                return 0, True
            else:
                logger.error(f"Codeforces API error for {handle}: status {resp.status_code}")
                return 0, False
    except Exception as e:
        logger.error(f"Codeforces connection error for {handle}: {e}")
        return 0, False
    return 0, False

async def fetch_leetcode_solved(handle: str) -> tuple[int, bool]:
    if not handle:
        return 0, True
    handle = handle.lstrip('@').strip()
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
            resp = await client.post(
                "https://leetcode.com/graphql",
                json={"query": query, "variables": {"username": handle}},
                headers=HEADERS,
                timeout=10.0
            )
            if resp.status_code == 200:
                data = resp.json()
                if "data" in data and data["data"].get("matchedUser"):
                    stats = data["data"]["matchedUser"]["submitStats"]["acSubmissionNum"]
                    for stat in stats:
                        if stat["difficulty"] == "All":
                            return stat["count"], True
                    return 0, True
                else:
                    logger.warning(f"LeetCode handle not found: {handle}")
                    return 0, True
            else:
                logger.error(f"LeetCode API error for {handle}: status {resp.status_code}")
                return 0, False
    except Exception as e:
        logger.error(f"LeetCode connection error for {handle}: {e}")
        return 0, False

async def fetch_atcoder_rating(handle: str) -> tuple[int, bool]:
    if not handle:
        return 0, True
    handle = handle.lstrip('@').strip()
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://atcoder.jp/users/{handle}",
                headers=HEADERS,
                timeout=10.0
            )
            if resp.status_code == 200:
                import re
                m = re.search(r'Rating</th>\s*<td>\s*(?:<img[^>]*>)?\s*<span\s+class=[\"\'][^\"\'\s]+[\"\']>(\d+)</span>', resp.text)
                if m:
                    return int(m.group(1)), True
                return 0, True
            elif resp.status_code == 404:
                logger.warning(f"AtCoder handle not found: {handle}")
                return 0, True
            else:
                logger.error(f"AtCoder scraping error for {handle}: status {resp.status_code}")
                return 0, False
    except Exception as e:
        logger.error(f"AtCoder connection error for {handle}: {e}")
        return 0, False

async def fetch_cses_solved(handle: str) -> tuple[int, bool]:
    if not handle:
        return 0, True
    handle = handle.lstrip('@').strip()
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://cses.fi/user/{handle}",
                headers=HEADERS,
                timeout=10.0
            )
            if resp.status_code == 200:
                import re
                m = re.search(r'Submission count:</td><td\s*>\s*(\d+)', resp.text)
                if m:
                    return int(m.group(1)), True
                return 0, True
            elif resp.status_code == 404:
                logger.warning(f"CSES handle not found (ensure you use the numeric ID): {handle}")
                return 0, True
            else:
                logger.error(f"CSES scraping error for {handle}: status {resp.status_code}")
                return 0, False
    except Exception as e:
        logger.error(f"CSES connection error for {handle}: {e}")
        return 0, False

async def sync_user_ratings(user) -> bool:
    cf_task = fetch_codeforces_rating(user.cf_handle)
    lc_task = fetch_leetcode_solved(user.lc_handle)
    ac_task = fetch_atcoder_rating(user.ac_handle)
    cses_task = fetch_cses_solved(user.cses_handle)

    (cf_rating, cf_ok), (lc_solved, lc_ok), (ac_rating, ac_ok), (cses_solved, cses_ok) = await asyncio.gather(
        cf_task, lc_task, ac_task, cses_task
    )

    updated = False
    if user.cf_handle and cf_ok and cf_rating > 0:
        if user.codeforces_rating != cf_rating:
            user.codeforces_rating = cf_rating
            updated = True
    if user.lc_handle and lc_ok and lc_solved > 0:
        if user.leetcode_solved != lc_solved:
            user.leetcode_solved = lc_solved
            updated = True
    if user.ac_handle and ac_ok and ac_rating > 0:
        if user.atcoder_rating != ac_rating:
            user.atcoder_rating = ac_rating
            updated = True
    if user.cses_handle and cses_ok and cses_solved > 0:
        if user.cses_solved != cses_solved:
            user.cses_solved = cses_solved
            updated = True

    # Track if any of the configured handles failed to fetch due to network/server errors
    had_failures = False
    if user.cf_handle and not cf_ok:
        had_failures = True
    if user.lc_handle and not lc_ok:
        had_failures = True
    if user.ac_handle and not ac_ok:
        had_failures = True
    if user.cses_handle and not cses_ok:
        had_failures = True

    # Only mark sync as successful (updating the timestamp) if we had no network errors or did update at least one rating
    if not had_failures or updated:
        user.last_rating_update = datetime.now(timezone.utc)
        return True
    
    return False
