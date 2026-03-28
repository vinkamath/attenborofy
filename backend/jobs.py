import logging
import threading
import time
import uuid

logger = logging.getLogger(__name__)

MAX_CONCURRENT_JOBS = 2
JOB_TTL_SECONDS = 3600  # 1 hour


class JobStore:
    def __init__(self):
        self._jobs: dict[str, dict] = {}
        self._lock = threading.Lock()

    def create(self) -> str:
        job_id = str(uuid.uuid4())
        with self._lock:
            self._jobs[job_id] = {
                "status": "pending",
                "progress": "Queued...",
                "error": None,
                "result_path": None,
                "narration": None,
                "created_at": time.time(),
            }
        return job_id

    def get(self, job_id: str) -> dict | None:
        with self._lock:
            return self._jobs.get(job_id, {}).copy() if job_id in self._jobs else None

    def update(self, job_id: str, **kwargs) -> None:
        with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id].update(kwargs)

    def active_count(self) -> int:
        with self._lock:
            return sum(
                1 for j in self._jobs.values() if j["status"] in ("pending", "processing")
            )

    def cleanup_old(self) -> None:
        """Remove jobs older than JOB_TTL_SECONDS."""
        now = time.time()
        with self._lock:
            expired = [
                jid
                for jid, j in self._jobs.items()
                if now - j["created_at"] > JOB_TTL_SECONDS
            ]
            for jid in expired:
                del self._jobs[jid]
        if expired:
            logger.info(f"Cleaned up {len(expired)} expired jobs")


def start_job(job_store: JobStore, job_id: str, video_path: str, user_context: str) -> None:
    """Start a processing job in a background thread."""
    from pipeline import process_video

    def _run():
        process_video(job_id, video_path, user_context, job_store)

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()


def start_cleanup_timer(job_store: JobStore) -> None:
    """Periodically clean up expired jobs."""
    def _cleanup_loop():
        while True:
            time.sleep(300)  # Every 5 minutes
            job_store.cleanup_old()

    thread = threading.Thread(target=_cleanup_loop, daemon=True)
    thread.start()
