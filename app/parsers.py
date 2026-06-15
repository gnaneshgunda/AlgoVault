import re
from urllib.parse import urlparse

class BaseParser:
    def parse(self, url: str) -> str:
        raise NotImplementedError

class CodeforcesParser(BaseParser):
    def parse(self, url: str) -> str:
        # Matches formats like:
        # codeforces.com/contest/123/problem/A
        # codeforces.com/problemset/problem/123/A
        match = re.search(r'/(?:contest|problemset/problem)/(\d+)/(?:problem/)?([A-Za-z0-9]+)', url)
        if match:
            contest_id = match.group(1)
            problem_letter = match.group(2)
            return f"codeforces.com/problemset/problem/{contest_id}/{problem_letter}"
        return GenericParser().parse(url)

class LeetCodeParser(BaseParser):
    def parse(self, url: str) -> str:
        # Matches format: leetcode.com/problems/two-sum/
        match = re.search(r'/problems/([^/]+)', url)
        if match:
            problem_slug = match.group(1)
            return f"leetcode.com/problems/{problem_slug}"
        return GenericParser().parse(url)

class AtCoderParser(BaseParser):
    def parse(self, url: str) -> str:
        # Matches format: atcoder.jp/contests/abc123/tasks/abc123_a
        match = re.search(r'/contests/([^/]+)/tasks/([^/]+)', url)
        if match:
            contest = match.group(1)
            task = match.group(2)
            return f"atcoder.jp/contests/{contest}/tasks/{task}"
        return GenericParser().parse(url)

class CSESParser(BaseParser):
    def parse(self, url: str) -> str:
        # Matches format: cses.fi/problemset/task/1068
        match = re.search(r'/problemset/task/(\d+)', url)
        if match:
            task_id = match.group(1)
            return f"cses.fi/problemset/task/{task_id}"
        return GenericParser().parse(url)

class GenericParser(BaseParser):
    def parse(self, url: str) -> str:
        parsed_url = urlparse(url)
        netloc = parsed_url.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        path = parsed_url.path.rstrip('/')
        return f"{netloc}{path}"

class ParserFactory:
    @staticmethod
    def get_parser(platform: str) -> BaseParser:
        platform = platform.lower()
        if platform == "codeforces":
            return CodeforcesParser()
        elif platform == "leetcode":
            return LeetCodeParser()
        elif platform == "atcoder":
            return AtCoderParser()
        elif platform == "cses":
            return CSESParser()
        else:
            return GenericParser()


def auto_detect_platform(url: str) -> str:
    """
    Auto-detect the platform from a URL's domain.
    Returns the platform name string, or 'Other' for unrecognized domains.
    """
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        if domain.startswith("www."):
            domain = domain[4:]

        if "codeforces.com" in domain:
            return "Codeforces"
        elif "leetcode.com" in domain:
            return "LeetCode"
        elif "atcoder.jp" in domain:
            return "AtCoder"
        elif "cses.fi" in domain:
            return "CSES"
        elif "hackerrank.com" in domain:
            return "HackerRank"
        elif "geeksforgeeks.org" in domain:
            return "GeeksForGeeks"
        elif "spoj.com" in domain:
            return "SPOJ"
        elif "codechef.com" in domain:
            return "CodeChef"
        elif "hackerearth.com" in domain:
            return "HackerEarth"
        else:
            return "Other"
    except Exception:
        return "Other"
