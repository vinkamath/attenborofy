from datetime import UTC, datetime
import json
import logging
import os
import shutil
import subprocess
import tempfile
import time
import uuid
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_file, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

_REPO_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_REPO_ROOT / ".env")

from required_env import validate_required_env

validate_required_env(_REPO_ROOT / ".env.example")

from app_config import CONFIG, load_config
import gallery_store
from jobs import JOB_TTL_SECONDS, JobStore, start_cleanup_timer, start_job

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder=None)
app.secret_key = os.urandom(24)
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # 100MB

CORS(app)

job_store = JobStore()
start_cleanup_timer(job_store)

ALLOWED_EXTENSIONS = {"mp4", "mov", "webm", "avi", "mkv"}
FRONTEND_BUILD_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
GALLERY_DIR = os.path.join(os.path.dirname(__file__), "static", "gallery")


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ── API Routes ──────────────────────────────────────────────────────────────


@app.route("/api/config")
def public_config():
    """Non-secret limits for the web client (voice_id stays server-side only)."""
    cfg = load_config()
    logger.info(
        "Serving public config (min=%ss, max=%ss)",
        cfg.video_min_duration_seconds,
        cfg.video_max_duration_seconds,
    )
    return jsonify(
        {
            "video_min_duration_seconds": cfg.video_min_duration_seconds,
            "video_max_duration_seconds": cfg.video_max_duration_seconds,
        }
    )


@app.route("/api/upload", methods=["POST"])
def upload():
    request_start = time.perf_counter()
    if "video" not in request.files:
        logger.info("Upload rejected: missing 'video' file in request")
        return jsonify({"error": "No video file provided"}), 400

    file = request.files["video"]
    if file.filename == "" or not allowed_file(file.filename):
        logger.info("Upload rejected: invalid file '%s'", file.filename or "<empty>")
        return jsonify({"error": "Invalid file. Please upload mp4, mov, webm, avi, or mkv."}), 400

    if job_store.active_count() >= 2:
        logger.info("Upload rejected: server busy (>=2 active jobs)")
        return jsonify({"error": "Server is busy processing other videos. Please try again shortly."}), 503

    user_context = request.form.get("context", "")

    # Save uploaded video to temp
    ext = file.filename.rsplit(".", 1)[1].lower()
    video_id = str(uuid.uuid4())
    video_path = os.path.join(tempfile.gettempdir(), f"attenborofy_upload_{video_id}.{ext}")
    file.save(video_path)
    size_mb = os.path.getsize(video_path) / (1024 * 1024)

    # Create and start job
    job_id = job_store.create()
    logger.info(
        "Upload accepted: job_id=%s file='%s' ext=%s size=%.2fMB context_chars=%s",
        job_id,
        secure_filename(file.filename),
        ext,
        size_mb,
        len(user_context),
    )
    start_job(job_store, job_id, video_path, user_context)
    logger.info("Background job started: job_id=%s", job_id)
    logger.info(
        "Upload request complete: job_id=%s elapsed=%.3fs",
        job_id,
        time.perf_counter() - request_start,
    )

    return jsonify({"job_id": job_id}), 202


@app.route("/api/job/<job_id>/redo", methods=["POST"])
def redo_job(job_id):
    if job_store.active_count() >= 2:
        logger.info("Redo rejected: server busy (>=2 active jobs)")
        return jsonify({"error": "Server is busy processing other videos. Please try again shortly."}), 503

    original = job_store.get(job_id)
    if not original:
        logger.info("Redo requested for unknown job_id=%s", job_id)
        return jsonify({"error": "Original job not found. Please upload the video again."}), 404

    source_video_path = original.get("source_video_path")
    video_duration = original.get("video_duration")
    frames = original.get("frames")
    if not source_video_path or not os.path.exists(source_video_path):
        logger.info("Redo unavailable: source video missing for job_id=%s", job_id)
        return jsonify({"error": "Redo unavailable because original files expired. Please upload again."}), 410
    if not isinstance(video_duration, (int, float)) or not frames:
        logger.info("Redo unavailable: reusable artifacts missing for job_id=%s", job_id)
        return jsonify({"error": "Redo unavailable because analysis artifacts expired. Please upload again."}), 410

    payload = request.get_json(silent=True) or {}
    context_from_json = payload.get("context", "")
    context_from_form = request.form.get("context", "")
    user_context = (
        context_from_json if isinstance(context_from_json, str) else context_from_form
    )

    new_job_id = job_store.create()
    job_store.update(
        new_job_id,
        source_job_id=job_id,
        source_video_path=source_video_path,
        context=user_context,
    )
    start_job(
        job_store,
        new_job_id,
        source_video_path,
        user_context,
        reuse_artifacts={"duration": float(video_duration), "frames": frames},
    )
    logger.info("Redo job started: source_job_id=%s new_job_id=%s", job_id, new_job_id)
    return jsonify({"job_id": new_job_id}), 202


@app.route("/api/job/<job_id>/status")
def job_status(job_id):
    job = job_store.get(job_id)
    if not job:
        logger.info("Job status requested for unknown job_id=%s", job_id)
        return jsonify({"error": "Job not found"}), 404

    logger.info(
        "Job status requested: job_id=%s status=%s progress='%s'",
        job_id,
        job["status"],
        job["progress"],
    )
    created_at = float(job.get("created_at", time.time()))
    expires_at = created_at + JOB_TTL_SECONDS
    now = time.time()
    result_path = job.get("result_path")
    source_video_path = job.get("source_video_path")
    video_available = bool(
        isinstance(result_path, str) and os.path.exists(result_path)
    )
    redo_available = bool(
        video_available
        and isinstance(source_video_path, str)
        and os.path.exists(source_video_path)
        and isinstance(job.get("video_duration"), (int, float))
        and bool(job.get("frames"))
    )
    return jsonify(
        {
            "status": job["status"],
            "progress": job["progress"],
            "error": job["error"],
            "expires_at": expires_at,
            "seconds_until_cleanup": max(0, int(expires_at - now)),
            "video_available": video_available,
            "redo_available": redo_available,
        }
    )


@app.route("/api/job/<job_id>/video")
def job_video(job_id):
    job = job_store.get(job_id)
    if not job or job["status"] != "complete":
        logger.info("Video requested before completion: job_id=%s", job_id)
        return jsonify({"error": "Video not ready"}), 404

    result_path = job.get("result_path")
    if not result_path or not os.path.exists(result_path):
        logger.info("Video requested but file missing: job_id=%s path=%s", job_id, result_path)
        return jsonify({"error": "Video file not found"}), 404

    logger.info("Serving result video: job_id=%s path=%s", job_id, result_path)
    return send_file(result_path, mimetype="video/mp4", as_attachment=False)


@app.route("/api/job/<job_id>/narration")
def job_narration(job_id):
    job = job_store.get(job_id)
    if not job or job["status"] != "complete":
        logger.info("Narration requested before completion: job_id=%s", job_id)
        return jsonify({"error": "Narration not ready"}), 404

    logger.info("Serving narration text: job_id=%s", job_id)
    return jsonify({"narration": job.get("narration", "")})


@app.route("/api/gallery")
def gallery():
    if not gallery_store.is_enabled():
        logger.info("Gallery requested: blob storage not configured")
        return jsonify([])

    items = gallery_store.get_gallery_items()
    logger.info("Gallery requested: %d items", len(items))
    return jsonify(items)


@app.route("/api/gallery", methods=["POST"])
def add_to_gallery():
    if not gallery_store.is_enabled():
        return jsonify({"error": "Gallery is not configured"}), 503

    data = request.get_json() or {}
    job_id = data.get("job_id", "").strip()

    if not job_id:
        return jsonify({"error": "job_id is required"}), 400

    job = job_store.get(job_id)
    if not job or job["status"] != "complete":
        return jsonify({"error": "Job not found or not complete"}), 404

    result_path = job.get("result_path")
    if not result_path or not os.path.exists(result_path):
        return jsonify({"error": "Video file no longer available. Download your video before it expires."}), 410

    gallery_id = uuid.uuid4().hex[:12]

    # Upload video to blob storage
    video_url = gallery_store.upload_file(
        result_path, f"{gallery_id}.mp4", "video/mp4"
    )

    # Generate and upload thumbnail (best-effort)
    thumbnail_url = ""
    thumb_path = os.path.join(tempfile.gettempdir(), f"attenborofy_thumb_{gallery_id}.jpg")
    try:
        subprocess.run(
            [
                "ffmpeg", "-i", result_path, "-ss", "00:00:01",
                "-vframes", "1", "-vf", "scale=480:-1",
                "-y", thumb_path,
            ],
            capture_output=True,
            timeout=15,
        )
        if os.path.exists(thumb_path):
            thumbnail_url = gallery_store.upload_file(
                thumb_path, f"{gallery_id}_thumb.jpg", "image/jpeg"
            )
    except Exception:
        logger.warning("Thumbnail generation failed for gallery_id=%s", gallery_id)
    finally:
        if os.path.exists(thumb_path):
            os.remove(thumb_path)

    item = {
        "id": gallery_id,
        "video_url": video_url,
        "thumbnail_url": thumbnail_url,
        "created_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
    }

    # Prepend to gallery index (newest first)
    items = gallery_store.get_gallery_items()
    items.insert(0, item)
    gallery_store.save_gallery_items(items)

    logger.info("Added to gallery: id=%s", gallery_id)
    return jsonify(item), 201


@app.route("/api/gallery/<path:filename>")
def gallery_file(filename):
    return send_from_directory(GALLERY_DIR, filename)


# ── Serve React Frontend ────────────────────────────────────────────────────


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if not os.path.isdir(FRONTEND_BUILD_DIR):
        return "Frontend not built. Run: cd frontend && npm run build", 500

    # Serve static files if they exist
    full_path = os.path.join(FRONTEND_BUILD_DIR, path)
    if path and os.path.isfile(full_path):
        return send_from_directory(FRONTEND_BUILD_DIR, path)

    # SPA fallback: serve index.html for all routes
    return send_from_directory(FRONTEND_BUILD_DIR, "index.html")


if __name__ == "__main__":
    app.run(debug=True, port=5001)
