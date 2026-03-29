import json
import logging
import os
import tempfile
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

from app_config import CONFIG
from jobs import JobStore, start_cleanup_timer, start_job

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
    return jsonify(
        {
            "video_min_duration_seconds": CONFIG.video_min_duration_seconds,
            "video_max_duration_seconds": CONFIG.video_max_duration_seconds,
        }
    )


@app.route("/api/upload", methods=["POST"])
def upload():
    if "video" not in request.files:
        return jsonify({"error": "No video file provided"}), 400

    file = request.files["video"]
    if file.filename == "" or not allowed_file(file.filename):
        return jsonify({"error": "Invalid file. Please upload mp4, mov, webm, avi, or mkv."}), 400

    if job_store.active_count() >= 2:
        return jsonify({"error": "Server is busy processing other videos. Please try again shortly."}), 503

    user_context = request.form.get("context", "")

    # Save uploaded video to temp
    ext = file.filename.rsplit(".", 1)[1].lower()
    video_id = str(uuid.uuid4())
    video_path = os.path.join(tempfile.gettempdir(), f"attenborofy_upload_{video_id}.{ext}")
    file.save(video_path)

    # Create and start job
    job_id = job_store.create()
    start_job(job_store, job_id, video_path, user_context)

    return jsonify({"job_id": job_id}), 202


@app.route("/api/job/<job_id>/status")
def job_status(job_id):
    job = job_store.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404

    return jsonify({
        "status": job["status"],
        "progress": job["progress"],
        "error": job["error"],
    })


@app.route("/api/job/<job_id>/video")
def job_video(job_id):
    job = job_store.get(job_id)
    if not job or job["status"] != "complete":
        return jsonify({"error": "Video not ready"}), 404

    result_path = job.get("result_path")
    if not result_path or not os.path.exists(result_path):
        return jsonify({"error": "Video file not found"}), 404

    return send_file(result_path, mimetype="video/mp4", as_attachment=False)


@app.route("/api/job/<job_id>/narration")
def job_narration(job_id):
    job = job_store.get(job_id)
    if not job or job["status"] != "complete":
        return jsonify({"error": "Narration not ready"}), 404

    return jsonify({"narration": job.get("narration", "")})


@app.route("/api/gallery")
def gallery():
    gallery_json = os.path.join(GALLERY_DIR, "gallery.json")
    if not os.path.exists(gallery_json):
        return jsonify([])

    with open(gallery_json) as f:
        return jsonify(json.load(f))


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
