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
        "OPENAI_API_KEY",
        "OPENAI_MODEL",
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


# --- Provider group tests (OpenAI vs Azure) ---

_PROVIDER_KEYS = [
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
    "AZURE_OPENAI_API_KEY",
    "AZURE_OPENAI_ENDPOINT",
    "AZURE_OPENAI_DEPLOYMENT",
]


def _clear_provider_keys(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in _PROVIDER_KEYS:
        monkeypatch.delenv(key, raising=False)


def test_validate_ok_with_openai_keys(monkeypatch: pytest.MonkeyPatch):
    _clear_provider_keys(monkeypatch)
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("OPENAI_MODEL", "gpt-4o")
    validate_required_env(_EXAMPLE)


def test_validate_ok_with_azure_keys(monkeypatch: pytest.MonkeyPatch):
    _clear_provider_keys(monkeypatch)
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test")
    monkeypatch.setenv("AZURE_OPENAI_API_KEY", "key")
    monkeypatch.setenv("AZURE_OPENAI_ENDPOINT", "https://example.com")
    monkeypatch.setenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o")
    validate_required_env(_EXAMPLE)


def test_validate_fails_with_no_provider(monkeypatch: pytest.MonkeyPatch):
    _clear_provider_keys(monkeypatch)
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test")
    with pytest.raises(SystemExit):
        validate_required_env(_EXAMPLE)


def test_validate_fails_with_partial_azure(monkeypatch: pytest.MonkeyPatch):
    _clear_provider_keys(monkeypatch)
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test")
    monkeypatch.setenv("AZURE_OPENAI_API_KEY", "key")
    # missing ENDPOINT and DEPLOYMENT
    with pytest.raises(SystemExit):
        validate_required_env(_EXAMPLE)
