"""Tests for required_env parsing and validation."""

from __future__ import annotations

from pathlib import Path

import pytest

from required_env import env_keys_from_example, validate_required_env

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_EXAMPLE = _REPO_ROOT / ".env.example"


def test_env_keys_from_example_matches_checked_in_file():
    keys = env_keys_from_example(_EXAMPLE)
    assert keys == [
        "ELEVENLABS_API_KEY",
        "AZURE_OPENAI_API_KEY",
        "AZURE_OPENAI_ENDPOINT",
        "AZURE_OPENAI_DEPLOYMENT",
    ]


def test_validate_required_env_exits_when_missing(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    ex = tmp_path / ".env.example"
    ex.write_text("FOO=1\nBAR=2\n", encoding="utf-8")
    monkeypatch.delenv("FOO", raising=False)
    monkeypatch.delenv("BAR", raising=False)
    with pytest.raises(SystemExit) as exc:
        validate_required_env(ex)
    assert exc.value.code == 1


def test_validate_required_env_ok_when_all_set(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    ex = tmp_path / ".env.example"
    ex.write_text("FOO=x\n", encoding="utf-8")
    monkeypatch.setenv("FOO", "hello")
    validate_required_env(ex)  # does not raise


def test_validate_required_env_treats_blank_as_missing(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    ex = tmp_path / ".env.example"
    ex.write_text("FOO=x\n", encoding="utf-8")
    monkeypatch.setenv("FOO", "   ")
    with pytest.raises(SystemExit):
        validate_required_env(ex)
