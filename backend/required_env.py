"""Validate that every key listed in the repo-root .env.example is set and non-empty."""

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


def validate_required_env(example_path: Path) -> None:
    """Exit with code 1 if any key from .env.example is missing or blank in the environment."""
    if not example_path.is_file():
        print(
            f"required_env: .env.example not found at {example_path}",
            file=sys.stderr,
        )
        raise SystemExit(1)

    missing: list[str] = []
    for key in env_keys_from_example(example_path):
        val = os.environ.get(key)
        if val is None or not str(val).strip():
            missing.append(key)

    if not missing:
        return

    print(
        "Missing or empty environment variables (set them in .env; see .env.example):\n  "
        + "\n  ".join(missing),
        file=sys.stderr,
    )
    raise SystemExit(1)
