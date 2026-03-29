"""Tests for app_config loading."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app_config import AppConfig, load_config


def test_load_config_reads_repo_defaults():
    cfg = load_config()
    assert isinstance(cfg, AppConfig)
    assert cfg.voice_id
    assert cfg.video_min_duration_seconds >= 0
    assert cfg.video_max_duration_seconds >= cfg.video_min_duration_seconds


def test_load_config_rejects_empty_voice_id(tmp_path: Path):
    p = tmp_path / "config.json"
    p.write_text(
        json.dumps(
            {
                "voice_id": "  ",
                "video_min_duration_seconds": 0,
                "video_max_duration_seconds": 60,
            }
        ),
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="voice_id"):
        load_config(p)


def test_load_config_rejects_max_below_min(tmp_path: Path):
    p = tmp_path / "config.json"
    p.write_text(
        json.dumps(
            {
                "voice_id": "abc",
                "video_min_duration_seconds": 10,
                "video_max_duration_seconds": 5,
            }
        ),
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="video_max"):
        load_config(p)
