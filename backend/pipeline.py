import base64
import json
import logging
import math
import os
import subprocess
import tempfile
import time
from pathlib import Path

from elevenlabs import ElevenLabs, VoiceSettings
from elevenlabs.core.api_error import ApiError
from openai import OpenAI

from app_config import CONFIG, load_config

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

# Same idea as app.py: load repo .env before reading API keys (voice comes from config.json).
if load_dotenv is not None:
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logger = logging.getLogger(__name__)

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

# OpenAI-compatible config: plain OpenAI vars take precedence over Azure vars.
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL")
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")

VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID") or CONFIG.voice_id


def validate_video(path: str) -> tuple[bool, float, str]:
    """Validate video file and return (ok, duration_seconds, error_message)."""
    try:
        cfg = load_config()
        logger.info(
            "Validating video file: path=%s min=%ss max=%ss",
            path,
            cfg.video_min_duration_seconds,
            cfg.video_max_duration_seconds,
        )
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                "-show_streams",
                path,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            return False, 0, "Could not read video file. Please upload a valid video."

        info = json.loads(result.stdout)
        duration = float(info["format"]["duration"])

        if duration < cfg.video_min_duration_seconds:
            return (
                False,
                duration,
                f"Video is {duration:.0f}s long. Minimum is {cfg.video_min_duration_seconds:g} seconds.",
            )
        if duration > cfg.video_max_duration_seconds:
            return (
                False,
                duration,
                f"Video is {duration:.0f}s long. Maximum is {cfg.video_max_duration_seconds:g} seconds.",
            )

        has_video = any(s["codec_type"] == "video" for s in info.get("streams", []))
        if not has_video:
            return False, 0, "File does not contain a video stream."

        return True, duration, ""
    except Exception as e:
        logger.error(f"Video validation error: {e}")
        return False, 0, f"Error validating video: {e}"


def extract_frames(video_path: str, num_frames: int = 10) -> list[str]:
    """Extract evenly-spaced frames from video, return as base64-encoded JPEGs."""
    tmp_dir = tempfile.mkdtemp(prefix="attenborofy_frames_")
    logger.info("Extracting frames: path=%s target_frames=%s", video_path, num_frames)

    # Get duration first
    result = subprocess.run(
        [
            "ffprobe", "-v", "quiet",
            "-show_entries", "format=duration",
            "-of", "csv=p=0",
            video_path,
        ],
        capture_output=True, text=True, timeout=30,
    )
    duration = float(result.stdout.strip())
    interval = duration / num_frames

    # Extract frames using fps filter
    fps = num_frames / duration
    subprocess.run(
        [
            "ffmpeg", "-i", video_path,
            "-vf", f"fps={fps}",
            "-frames:v", str(num_frames),
            "-q:v", "2",
            os.path.join(tmp_dir, "frame_%03d.jpg"),
        ],
        capture_output=True, timeout=60,
    )

    frames = []
    for i in range(1, num_frames + 1):
        frame_path = os.path.join(tmp_dir, f"frame_{i:03d}.jpg")
        if os.path.exists(frame_path):
            with open(frame_path, "rb") as f:
                frames.append(base64.b64encode(f.read()).decode("utf-8"))

    logger.info(f"Extracted {len(frames)} frames from video")
    return frames


def analyze_and_narrate(
    frames: list[str], duration: float, user_context: str
) -> str:
    """Use an OpenAI-compatible vision model to analyze frames and generate Attenborough narration."""
    logger.info(
        "Starting narration generation: frames=%s duration=%.2fs context_chars=%s",
        len(frames),
        duration,
        len(user_context),
    )

    # Plain OpenAI takes precedence; fall back to Azure OpenAI vars.
    if (OPENAI_API_KEY or "").strip():
        client = OpenAI(api_key=OPENAI_API_KEY.strip())
        model = (OPENAI_MODEL).strip()
    else:
        api_key = (AZURE_OPENAI_API_KEY or "").strip()
        base_url = (AZURE_OPENAI_ENDPOINT or "").strip()
        deployment = (AZURE_OPENAI_DEPLOYMENT or "").strip()
        if not api_key:
            raise ValueError(
                "Set OPENAI_API_KEY (for OpenAI) or AZURE_OPENAI_API_KEY (for Azure)."
            )
        if not base_url:
            raise ValueError("AZURE_OPENAI_ENDPOINT must be set in the environment.")
        if not deployment:
            raise ValueError("AZURE_OPENAI_DEPLOYMENT must be set in the environment.")
        client = OpenAI(api_key=api_key, base_url=base_url)
        model = deployment

    # Target ~1.8 words per second for unhurried Attenborough pacing
    target_words = int(duration * 1.8)

    context_section = ""
    if user_context.strip():
        context_section = f"\n\nThe filmmaker has provided this context: {user_context.strip()}"

    # Build image content blocks
    image_content = []
    for i, frame_b64 in enumerate(frames):
        image_content.append({
            "type": "text",
            "text": f"Frame {i + 1} of {len(frames)}:",
        })
        image_content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{frame_b64}",
                "detail": "low",
            },
        })

    messages = [
        {
            "role": "system",
            "content": (
                "You are Sir David Attenborough, the legendary nature documentary narrator. "
                "You are narrating a short video. Your narration should be warm, insightful, "
                "witty, and full of wonder — capturing the essence of what makes these moments "
                "remarkable. Use Attenborough's distinctive style: gentle observations, "
                "unexpected insights about behavior, and a sense of reverence for the subject. "
                "If the video features animals or nature, lean into classic wildlife documentary style. "
                "If it features humans, treat them with the same gentle anthropological curiosity "
                "Attenborough would bring to observing any fascinating species. "
                "Use dry, tongue-in-cheek British humour throughout: playful understatement, polite irony, "
                "and the occasional cheeky observation. Keep it family-friendly and affectionate rather than mean. "
                "Avoid sarcasm that undermines the subject; the humour should feel clever, warm, and lightly quirky."
            ),
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        f"Here are {len(frames)} evenly-spaced frames from a {duration:.0f}-second video."
                        f"{context_section}\n\n"
                        f"Write a narration of approximately {target_words} words "
                        f"(this is important for timing — the narration must fit within {duration:.0f} seconds). "
                        "Aim slightly under the word count to leave room for natural pauses. "
                        "It is critical that the narration ends with a complete sentence — never cut off mid-thought. "
                        "Write ONLY the narration text, nothing else. No stage directions, "
                        "no timestamps, no parentheticals. Just the words David Attenborough would speak."
                    ),
                },
                *image_content,
            ],
        },
    ]

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        max_completion_tokens=1000,
    )

    raw = response.choices[0].message.content
    if not raw:
        raise ValueError("OpenAI returned empty narration content.")
    narration = raw.strip()
    logger.info(f"Generated narration: {len(narration.split())} words (target: {target_words})")
    return narration


def _elevenlabs_error_message(exc: ApiError) -> str:
    """Best-effort user-facing detail from ElevenLabs ApiError body."""
    body = exc.body
    if isinstance(body, dict):
        detail = body.get("detail")
        if isinstance(detail, dict) and detail.get("message"):
            return str(detail["message"])
    return str(body)


def text_to_speech(text: str, voice_id: str | None = None) -> str:
    """Convert text to speech using ElevenLabs. Returns path to MP3 file.

    If voice_id is omitted, uses voice_id from config.json (CONFIG.voice_id).
    """
    api_key = (os.getenv("ELEVENLABS_API_KEY") or ELEVENLABS_API_KEY or "").strip()
    if not api_key:
        raise ValueError("ELEVENLABS_API_KEY must be set in the environment.")

    vid = (voice_id if voice_id is not None else VOICE_ID) or ""
    vid = vid.strip()
    if not vid:
        raise ValueError(
            "voice_id must be non-empty when passed explicitly; "
            "otherwise set voice_id in config.json."
        )

    client = ElevenLabs(api_key=api_key)
    logger.info("Starting TTS generation: voice_id=%s text_words=%s", vid, len(text.split()))
    response = client.text_to_speech.convert(
        voice_id=vid,
        output_format="mp3_44100_128",
        text=text,
        model_id="eleven_multilingual_v2",
        voice_settings=VoiceSettings(
            use_speaker_boost=True,
            similarity_boost=CONFIG.tts_similarity_boost,
            stability=CONFIG.tts_stability,
            speed=CONFIG.tts_speed,
        ),
    )

    audio_path = os.path.join(tempfile.gettempdir(), f"attenborofy_narration_{os.getpid()}_{id(text)}.mp3")
    try:
        with open(audio_path, "wb") as f:
            for chunk in response:
                if chunk:
                    f.write(chunk)
    except ApiError as e:
        logger.error(
            "ElevenLabs TTS failed (HTTP %s): %s",
            e.status_code,
            _elevenlabs_error_message(e),
        )
        raise

    logger.info(f"Generated TTS audio: {audio_path}")
    return audio_path


def get_audio_duration(audio_path: str) -> float:
    """Get duration of an audio file in seconds."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "quiet",
            "-show_entries", "format=duration",
            "-of", "csv=p=0",
            audio_path,
        ],
        capture_output=True, text=True, timeout=30,
    )
    return float(result.stdout.strip())


def generate_srt(text: str, audio_duration: float) -> str:
    """Generate SRT subtitle file from narration text. Returns path to SRT file."""
    words = text.split()
    total_words = len(words)

    # Split into chunks of ~6 words
    chunk_size = 6
    chunks = []
    for i in range(0, total_words, chunk_size):
        chunks.append(" ".join(words[i : i + chunk_size]))

    srt_lines = []
    for i, chunk in enumerate(chunks):
        # Proportional timing based on word count
        chunk_words = len(chunk.split())
        start_word = sum(len(c.split()) for c in chunks[:i])
        end_word = start_word + chunk_words

        start_time = (start_word / total_words) * audio_duration
        end_time = (end_word / total_words) * audio_duration

        srt_lines.append(str(i + 1))
        srt_lines.append(f"{_format_srt_time(start_time)} --> {_format_srt_time(end_time)}")
        srt_lines.append(chunk)
        srt_lines.append("")

    srt_content = "\n".join(srt_lines)
    srt_path = os.path.join(tempfile.gettempdir(), f"attenborofy_subs_{os.getpid()}_{id(text)}.srt")
    with open(srt_path, "w") as f:
        f.write(srt_content)

    logger.info(f"Generated SRT with {len(chunks)} subtitle blocks")
    return srt_path


def _format_srt_time(seconds: float) -> str:
    """Format seconds as SRT timestamp HH:MM:SS,mmm."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def compose_video(
    video_path: str, audio_path: str, srt_path: str, output_path: str
) -> str:
    """Overlay narration audio and burn subtitles onto original video."""
    logger.info(
        "Starting composition: video=%s audio=%s srt=%s output=%s",
        video_path,
        audio_path,
        srt_path,
        output_path,
    )
    # Get audio duration to know if we need to pad
    audio_dur = get_audio_duration(audio_path)

    # Build ffmpeg command:
    # - Mix original audio at 20% with narration
    # - Burn in subtitles
    # Escape the SRT path for ffmpeg subtitle filter (colons and backslashes)
    srt_escaped = srt_path.replace("\\", "\\\\").replace(":", "\\:")

    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-i", audio_path,
        "-filter_complex",
        (
            "[0:a]volume=0.2[orig];"
            "[1:a]volume=1.0[narr];"
            "[orig][narr]amix=inputs=2:duration=first:dropout_transition=2[aout]"
        ),
        "-vf", f"subtitles='{srt_escaped}':force_style='FontSize=12,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,MarginV=30'",
        "-map", "0:v",
        "-map", "[aout]",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-profile:v", "high",
        "-preset", "fast",
        "-crf", "23",
        "-g", "48",
        "-maxrate", "2M",
        "-bufsize", "4M",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        output_path,
    ]

    logger.info(f"Composing video: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

    if result.returncode != 0:
        # Try without subtitles as fallback (in case libass isn't available)
        logger.warning(f"Subtitle burn failed, trying without subtitles: {result.stderr[-500:]}")
        cmd_no_subs = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", audio_path,
            "-filter_complex",
            (
                "[0:a]volume=0.2[orig];"
                "[1:a]volume=1.0[narr];"
                "[orig][narr]amix=inputs=2:duration=first:dropout_transition=2[aout]"
            ),
            "-map", "0:v",
            "-map", "[aout]",
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-profile:v", "high",
            "-preset", "fast",
            "-crf", "23",
            "-g", "48",
            "-maxrate", "2M",
            "-bufsize", "4M",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            output_path,
        ]
        result = subprocess.run(cmd_no_subs, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            raise RuntimeError(f"ffmpeg failed: {result.stderr[-500:]}")

    logger.info(f"Composed video saved to {output_path}")
    return output_path


def process_video(
    job_id: str,
    video_path: str,
    user_context: str,
    job_store,
    reuse_artifacts: dict | None = None,
) -> None:
    """Full processing pipeline. Updates job_store at each step."""
    try:
        total_start = time.perf_counter()
        logger.info("Job %s started: video_path=%s", job_id, video_path)
        output_path = os.path.join(
            tempfile.gettempdir(), f"attenborofy_output_{job_id}.mp4"
        )
        reuse_duration = None
        reuse_frames = None
        if reuse_artifacts:
            duration_candidate = reuse_artifacts.get("duration")
            frames_candidate = reuse_artifacts.get("frames")
            if isinstance(duration_candidate, (int, float)) and isinstance(frames_candidate, list):
                reuse_duration = float(duration_candidate)
                reuse_frames = frames_candidate

        job_store.update(job_id, status="processing", source_video_path=video_path, context=user_context)
        if reuse_duration is not None and reuse_frames:
            duration = reuse_duration
            frames = reuse_frames
            job_store.update(job_id, progress="Reusing previous video analysis...")
            logger.info(
                "Job %s using reusable artifacts: duration=%.2fs frames=%s",
                job_id,
                duration,
                len(frames),
            )
        else:
            # Step 1: Validate
            step_start = time.perf_counter()
            job_store.update(job_id, progress="Validating video...")
            ok, duration, error = validate_video(video_path)
            logger.info(
                "Job %s validate step finished: ok=%s duration=%.2fs elapsed=%.3fs",
                job_id,
                ok,
                duration,
                time.perf_counter() - step_start,
            )
            if not ok:
                job_store.update(job_id, status="error", error=error)
                logger.info("Job %s failed validation: %s", job_id, error)
                return

            # Step 2: Extract frames
            step_start = time.perf_counter()
            job_store.update(job_id, progress="Analyzing video frames...")
            frames = extract_frames(video_path, num_frames=min(10, max(4, int(duration))))
            logger.info(
                "Job %s frame extraction finished: frames=%s elapsed=%.3fs",
                job_id,
                len(frames),
                time.perf_counter() - step_start,
            )

        if not frames:
            job_store.update(job_id, status="error", error="Could not extract frames from video.")
            logger.info("Job %s failed: no frames extracted", job_id)
            return

        job_store.update(job_id, video_duration=duration, frames=frames)

        # Step 3: Generate narration
        step_start = time.perf_counter()
        job_store.update(job_id, progress="Writing narration script...")
        narration = analyze_and_narrate(frames, duration, user_context)
        logger.info(
            "Job %s narration step finished: words=%s elapsed=%.3fs",
            job_id,
            len(narration.split()),
            time.perf_counter() - step_start,
        )

        # Step 4: Text to speech
        step_start = time.perf_counter()
        job_store.update(job_id, progress="Generating voiceover...")
        audio_path = text_to_speech(narration)
        audio_duration = get_audio_duration(audio_path)
        logger.info(
            "Job %s TTS step finished: audio_path=%s audio_duration=%.2fs elapsed=%.3fs",
            job_id,
            audio_path,
            audio_duration,
            time.perf_counter() - step_start,
        )

        # Step 5: Generate subtitles
        step_start = time.perf_counter()
        job_store.update(job_id, progress="Creating subtitles...")
        srt_path = generate_srt(narration, audio_duration)
        logger.info(
            "Job %s subtitle step finished: srt_path=%s elapsed=%.3fs",
            job_id,
            srt_path,
            time.perf_counter() - step_start,
        )

        # Step 6: Compose final video
        step_start = time.perf_counter()
        job_store.update(job_id, progress="Composing final video...")
        compose_video(video_path, audio_path, srt_path, output_path)
        logger.info(
            "Job %s compose step finished: output_path=%s elapsed=%.3fs",
            job_id,
            output_path,
            time.perf_counter() - step_start,
        )

        # Done
        job_store.update(
            job_id,
            status="complete",
            progress="Done!",
            result_path=output_path,
            narration=narration,
            source_video_path=video_path,
            video_duration=duration,
            frames=frames,
            context=user_context,
        )
        logger.info(
            "Job %s completed successfully in %.3fs",
            job_id,
            time.perf_counter() - total_start,
        )

    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}", exc_info=True)
        job_store.update(job_id, status="error", error=str(e))
