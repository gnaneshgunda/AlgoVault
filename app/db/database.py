from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.config import settings


db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif db_url.startswith("sqlite://"):
    db_url = db_url.replace("sqlite://", "sqlite+aiosqlite://", 1)
# Auto-encode passwords containing special characters (like '@' or ':') to prevent URL parsing errors
if "://" in db_url:
    scheme, rest = db_url.split("://", 1)
    if "@" in rest:
        credentials, host = rest.rsplit("@", 1)
        if ":" in credentials:
            username, password = credentials.split(":", 1)
            import urllib.parse
            unquoted_password = urllib.parse.unquote(password)
            encoded_password = urllib.parse.quote_plus(unquoted_password)
            db_url = f"{scheme}://{username}:{encoded_password}@{host}"
# Strip pgBouncer-specific parameters that asyncpg doesn't accept
# Using string methods instead of urllib.parse to avoid parser crashes on bracketed passwords (like placeholder '[YOUR-PASSWORD]')
if "postgresql+asyncpg" in db_url and "?" in db_url:
    base, query = db_url.split("?", 1)
    params = query.split("&")
    new_params = [p for p in params if not p.startswith("pgbouncer=")]
    if new_params:
        db_url = base + "?" + "&".join(new_params)
    else:
        db_url = base

# Make sure all API connections go to test.db or specified URL.
connect_args = {}
if db_url.startswith("postgresql+asyncpg"):
    connect_args["statement_cache_size"] = 0

engine = create_async_engine(
    db_url,
    echo=False,
    future=True,
    connect_args=connect_args
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
