"""Non-secret app settings loaded from config.json (next to this file)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

_CONFIG_PATH = Path(__file__).resolve().parent / "config.json"


@dataclass(frozen=True)
class AppConfig:
    voice_id: str
    video_min_duration_seconds: float
    video_max_duration_seconds: float


def load_config(path: Path | None = None) -> AppConfig:
    p = path or _CONFIG_PATH
    if not p.is_file():
        raise FileNotFoundError(f"Missing config file: {p}")
    raw = json.loads(p.read_text(encoding="utf-8"))
    voice_id = (raw.get("voice_id") or "").strip()
    if not voice_id:
        raise ValueError("config.json: voice_id must be a non-empty string")
    vmin = float(raw["video_min_duration_seconds"])
    vmax = float(raw["video_max_duration_seconds"])
    if vmin < 0:
        raise ValueError("config.json: video_min_duration_seconds must be >= 0")
    if vmax < vmin:
        raise ValueError(
            "config.json: video_max_duration_seconds must be >= video_min_duration_seconds"
        )
    return AppConfig(
        voice_id=voice_id,
        video_min_duration_seconds=vmin,
        video_max_duration_seconds=vmax,
    )


CONFIG = load_config()
