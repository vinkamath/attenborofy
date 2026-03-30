"""Pytest session-level environment validation."""

from __future__ import annotations

from pathlib import Path

import pytest
from dotenv import load_dotenv

from required_env import validate_required_env

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_ENV_FILE = _REPO_ROOT / ".env"
_EXAMPLE_FILE = _REPO_ROOT / ".env.example"


def pytest_sessionstart(session: pytest.Session) -> None:
    """Validate required env vars before collecting/running tests."""
    if _ENV_FILE.is_file():
        load_dotenv(_ENV_FILE, override=False)

    try:
        validate_required_env(_EXAMPLE_FILE)
    except SystemExit as exc:
        pytest.exit(
            f"Environment validation failed before tests start: {exc}",
            returncode=int(exc.code) if isinstance(exc.code, int) else 1,
        )
