"""Tests for pipeline helpers.

TTS integration tests write temporary MP3s and delete them. To keep copies you can play
(open in Finder, `open` on macOS, VLC, etc.), set:

    KEEP_TTS_TEST_AUDIO=1

Files are saved under backend/tests/tts_samples/ (gitignored via *.mp3).
"""
import os
import shutil
import warnings
from pathlib import Path

import pytest
from elevenlabs.core.api_error import ApiError

import pipeline as p

_TTS_SAMPLES_DIR = Path(__file__).resolve().parent / "tts_samples"

# Short line for TTS; voice IDs are ElevenLabs voice IDs (default voice comes from config.json).
_TTS_SAMPLE = "The forest breathes at dawn."
_VOICE_IDS_FOR_INTEGRATION = (
    #"JBFqnCBsd6RMkjVDRZzb",  # free-tier test voice
    "WdZjiN0nNcik2LBjOHiv",  # example narration voice
    #"jvcMcno3QtjOzGtfpjoI", # premium
)


def _cleanup_temp_mp3(temp_path: str, *, stem: str) -> None:
    """Delete temp_path. If KEEP_TTS_TEST_AUDIO is set, copy to tts_samples/{stem}.mp3 first."""
    if os.getenv("KEEP_TTS_TEST_AUDIO"):
        _TTS_SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
        dest = _TTS_SAMPLES_DIR / f"{stem}.mp3"
        shutil.copy2(temp_path, dest)
        warnings.warn(
            f"KEEP_TTS_TEST_AUDIO: playable sample at {dest}",
            UserWarning,
            stacklevel=2,
        )
    try:
        os.unlink(temp_path)
    except OSError:
        pass


def _assert_valid_mp3(path: str) -> None:
    assert os.path.isfile(path)
    size = os.path.getsize(path)
    assert size >= 500, f"expected MP3 payload, got {size} bytes"
    with open(path, "rb") as f:
        head = f.read(4)
    assert head[:3] == b"ID3" or (head[0] == 0xFF and (head[1] & 0xE0) == 0xE0), (
        "output does not look like MP3"
    )


def test_text_to_speech_converts_via_elevenlabs_api():
    """
    Real ElevenLabs call. Fails if the API rejects the request (e.g. 402) or returns no audio.
    Mocked TTS tests always pass; this one fails when TTS cannot actually run.
    """
    if not os.getenv("ELEVENLABS_API_KEY") or not p.VOICE_ID.strip():
        pytest.skip(
            "ELEVENLABS_API_KEY must be set and config.json must define voice_id — cannot verify default-voice TTS"
        )

    try:
        path = p.text_to_speech("Hi.")
    except ApiError as e:
        if e.status_code == 402:
            pytest.fail(
                f"ElevenLabs 402 Payment Required: voice '{p.VOICE_ID}' needs a paid plan. "
                f"Set voice_id in config.json to a voice your plan allows. Detail: {p._elevenlabs_error_message(e)}"
            )
        raise

    try:
        _assert_valid_mp3(path)
    finally:
        _cleanup_temp_mp3(path, stem="hi_default")


@pytest.mark.parametrize("voice_id", _VOICE_IDS_FOR_INTEGRATION)
def test_text_to_speech_short_sentence_per_voice_id(voice_id: str):
    """Real ElevenLabs: same sentence, different voice IDs — verifies each returns MP3."""
    if not os.getenv("ELEVENLABS_API_KEY"):
        pytest.skip("ELEVENLABS_API_KEY not set — cannot verify TTS without credentials")

    try:
        path = p.text_to_speech(_TTS_SAMPLE, voice_id=voice_id)
    except ApiError as e:
        if e.status_code == 402:
            pytest.fail(
                f"ElevenLabs 402 for voice_id={voice_id!r}: {p._elevenlabs_error_message(e)}"
            )
        raise

    try:
        _assert_valid_mp3(path)
    finally:
        _cleanup_temp_mp3(path, stem=f"short_sentence_{voice_id}")
