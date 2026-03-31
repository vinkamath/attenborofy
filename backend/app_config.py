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
    tts_similarity_boost: float
    tts_stability: float
    tts_speed: float
    job_ttl_seconds: int


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
    sim = float(raw["tts_similarity_boost"])
    stab = float(raw["tts_stability"])
    spd = float(raw["tts_speed"])
    if not 0.0 <= sim <= 1.0:
        raise ValueError("config.json: tts_similarity_boost must be between 0 and 1")
    if not 0.0 <= stab <= 1.0:
        raise ValueError("config.json: tts_stability must be between 0 and 1")
    if spd <= 0.0:
        raise ValueError("config.json: tts_speed must be positive")
    ttl = int(raw.get("job_ttl_seconds", 3600))
    if ttl <= 0:
        raise ValueError("config.json: job_ttl_seconds must be positive")
    return AppConfig(
        voice_id=voice_id,
        video_min_duration_seconds=vmin,
        video_max_duration_seconds=vmax,
        tts_similarity_boost=sim,
        tts_stability=stab,
        tts_speed=spd,
        job_ttl_seconds=ttl,
    )


CONFIG = load_config()
