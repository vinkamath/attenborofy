"""Validate that required environment variables are set.

Reads uncommented keys from .env.example as the baseline, then applies
special rules for mutually-exclusive groups (e.g. OpenAI vs Azure OpenAI).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path


def env_keys_from_example(example_path: Path) -> list[str]:
    """Return assignment keys from .env.example (non-comment, non-empty lines with KEY=...)."""
    text = example_path.read_text(encoding="utf-8")
    keys: list[str] = []
    seen: set[str] = set()
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key = line.split("=", 1)[0].strip()
        if not key:
            continue
        if key not in seen:
            seen.add(key)
            keys.append(key)
    return keys


# Keys that belong to mutually-exclusive provider groups.
# At least one complete group must be satisfied; the others are ignored.
_OPENAI_KEYS = {"OPENAI_API_KEY", "OPENAI_MODEL"}
_AZURE_KEYS = {"AZURE_OPENAI_API_KEY", "AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_DEPLOYMENT"}


def _is_set(key: str) -> bool:
    val = os.environ.get(key)
    return val is not None and val.strip() != ""


def validate_required_env(example_path: Path) -> None:
    """Exit with code 1 if required env vars are missing or blank."""
    if not example_path.is_file():
        print(
            f"required_env: .env.example not found at {example_path}",
            file=sys.stderr,
        )
        raise SystemExit(1)

    all_keys = set(env_keys_from_example(example_path))
    provider_keys = _OPENAI_KEYS | _AZURE_KEYS

    # Check non-provider keys unconditionally.
    missing: list[str] = []
    for key in sorted(all_keys - provider_keys):
        if not _is_set(key):
            missing.append(key)

    # At least one provider group must be fully set.
    has_openai = all(_is_set(k) for k in _OPENAI_KEYS)
    has_azure = all(_is_set(k) for k in _AZURE_KEYS)
    if not has_openai and not has_azure:
        missing.append(
            "OPENAI_API_KEY (for OpenAI) or "
            "AZURE_OPENAI_API_KEY + AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_DEPLOYMENT (for Azure)"
        )

    if not missing:
        return

    print(
        "Missing or empty environment variables (set them in .env; see .env.example):\n  "
        + "\n  ".join(missing),
        file=sys.stderr,
    )
    raise SystemExit(1)
