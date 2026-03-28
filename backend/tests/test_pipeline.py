"""Tests for pipeline helpers."""
import os

import pytest
from elevenlabs.core.api_error import ApiError

import pipeline as p


def test_text_to_speech_converts_via_elevenlabs_api():
    """
    Real ElevenLabs call. Fails if the API rejects the request (e.g. 402) or returns no audio.
    Mocked TTS tests always pass; this one fails when TTS cannot actually run.
    """
    if not os.getenv("ELEVENLABS_API_KEY"):
        pytest.skip("ELEVENLABS_API_KEY not set — cannot verify TTS without credentials")

    try:
        path = p.text_to_speech("Hi.")
    except ApiError as e:
        if e.status_code == 402:
            pytest.fail(
                f"ElevenLabs 402 Payment Required: voice '{p.VOICE_ID}' needs a paid plan. "
                f"Set TEST_VOICE=true or use a free voice. Detail: {p._elevenlabs_error_message(e)}"
            )
        raise

    try:
        assert os.path.isfile(path)
        size = os.path.getsize(path)
        assert size >= 500, f"expected MP3 payload, got {size} bytes"

        with open(path, "rb") as f:
            head = f.read(4)
        # MP3 frame sync, or ID3v2 tag at start of file
        assert head[:3] == b"ID3" or (head[0] == 0xFF and (head[1] & 0xE0) == 0xE0), (
            "output does not look like MP3"
        )
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass
