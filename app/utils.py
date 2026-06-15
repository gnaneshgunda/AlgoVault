import hashlib
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode

def normalize_and_hash_url(url: str) -> str:
    """
    Normalizes a problem URL (strips extraneous query params, handles trailing slashes)
    and returns a SHA-256 hash to be used as a unique identifier.
    """
    parsed_url = urlparse(url)

    # Lowercase domain
    netloc = parsed_url.netloc.lower()

    # Strip trailing slashes from path
    path = parsed_url.path.rstrip('/')

    # Sort query parameters to ensure consistent URLs (and strip useless ones if needed)
    # For now, we will sort them. Some platforms might need specific query params.
    query_params = parse_qs(parsed_url.query)

    # Optional: we could strip specific tracking parameters here (e.g., utm_source)
    # For CP platforms, usually query params are either empty or specific to the problem

    sorted_query = urlencode(sorted(query_params.items()), doseq=True)

    normalized_url = urlunparse((
        parsed_url.scheme.lower(),
        netloc,
        path,
        parsed_url.params,
        sorted_query,
        "" # Strip fragments (#)
    ))

    return hashlib.sha256(normalized_url.encode('utf-8')).hexdigest()
