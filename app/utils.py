import hashlib
from app.parsers import ParserFactory

def normalize_and_hash_url(url: str, platform: str) -> str:
    """
    Normalizes a problem URL using the ParserFactory to extract the canonical string,
    then returns a SHA-256 hash.
    """
    parser = ParserFactory.get_parser(platform)
    canonical_url = parser.parse(url)

    return hashlib.sha256(canonical_url.encode('utf-8')).hexdigest()
