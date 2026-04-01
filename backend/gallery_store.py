"""Azure Blob Storage backend for the video gallery.

Stores gallery videos, thumbnails, and the gallery.json index in a single
Azure Blob container.  When AZURE_STORAGE_CONNECTION_STRING is not set the
module is a no-op (gallery features are disabled gracefully).
"""

from __future__ import annotations

import json
import logging
import os
import threading
from typing import Any

logger = logging.getLogger(__name__)

_CONNECTION_STRING = os.environ.get("AZURE_STORAGE_CONNECTION_STRING", "")
_CONTAINER_NAME = os.environ.get("AZURE_STORAGE_CONTAINER", "gallery")
_GALLERY_INDEX = "gallery.json"

_lock = threading.Lock()


def is_enabled() -> bool:
    return bool(_CONNECTION_STRING)


def _get_container_client():
    from azure.storage.blob import BlobServiceClient

    service = BlobServiceClient.from_connection_string(_CONNECTION_STRING)
    container = service.get_container_client(_CONTAINER_NAME)
    # Auto-create the container if it doesn't exist.
    try:
        container.get_container_properties()
    except Exception:
        container.create_container(public_access="blob")
    return container


def upload_file(local_path: str, blob_name: str, content_type: str) -> str:
    """Upload a local file to blob storage and return its public URL."""
    container = _get_container_client()
    from azure.storage.blob import ContentSettings

    with open(local_path, "rb") as f:
        container.upload_blob(
            name=blob_name,
            data=f,
            overwrite=True,
            content_settings=ContentSettings(content_type=content_type),
        )
    return f"{container.url}/{blob_name}"


def get_gallery_items() -> list[dict[str, Any]]:
    """Download and parse gallery.json from blob storage."""
    with _lock:
        try:
            container = _get_container_client()
            blob = container.get_blob_client(_GALLERY_INDEX)
            data = blob.download_blob().readall()
            return json.loads(data)
        except Exception:
            return []


def save_gallery_items(items: list[dict[str, Any]]) -> None:
    """Write gallery.json to blob storage (atomic overwrite)."""
    with _lock:
        container = _get_container_client()
        from azure.storage.blob import ContentSettings

        container.upload_blob(
            name=_GALLERY_INDEX,
            data=json.dumps(items, indent=2),
            overwrite=True,
            content_settings=ContentSettings(content_type="application/json"),
        )
