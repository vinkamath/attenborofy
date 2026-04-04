export interface UploadResponse {
  job_id: string;
  error?: string;
}

export interface JobStatus {
  status: "pending" | "processing" | "complete" | "error";
  progress: string;
  error: string | null;
  expires_at?: number;
  seconds_until_cleanup?: number;
  video_available?: boolean;
  redo_available?: boolean;
}

export interface GalleryItem {
  id?: string;
  video_url: string;
  thumbnail_url: string;
  created_at?: string;
}

export interface PublicAppConfig {
  video_min_duration_seconds: number;
  video_max_duration_seconds: number;
  gallery_enabled: boolean;
}

export async function getPublicAppConfig(): Promise<PublicAppConfig> {
  const res = await fetch("/api/config");
  if (!res.ok) throw new Error("Failed to load app config");
  return res.json();
}

export async function uploadVideo(
  file: File,
  context: string,
  onProgress?: (pct: number) => void,
  clip?: { start: number; end: number }
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("video", file);
    formData.append("context", context);
    if (clip) {
      formData.append("clip_start", String(clip.start));
      formData.append("clip_end", String(clip.end));
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      const data = JSON.parse(xhr.responseText);
      if (xhr.status >= 400) {
        reject(new Error(data.error || "Upload failed"));
      } else {
        resolve(data);
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.send(formData);
  });
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`/api/job/${jobId}/status`);
  if (!res.ok) throw new Error("Failed to get job status");
  return res.json();
}

export async function redoNarration(jobId: string, context: string): Promise<UploadResponse> {
  const res = await fetch(`/api/job/${jobId}/redo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Failed to redo narration");
  }
  return data;
}

export async function getNarration(jobId: string): Promise<string> {
  const res = await fetch(`/api/job/${jobId}/narration`);
  if (!res.ok) throw new Error("Failed to get narration");
  const data = await res.json();
  return data.narration;
}

export function getVideoUrl(jobId: string): string {
  return `/api/job/${jobId}/video`;
}

export async function getGallery(): Promise<GalleryItem[]> {
  const res = await fetch("/api/gallery");
  if (!res.ok) return [];
  return res.json();
}

export async function addToGallery(
  jobId: string
): Promise<GalleryItem> {
  const res = await fetch("/api/gallery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Failed to add to gallery" }));
    throw new Error(data.error || "Failed to add to gallery");
  }
  return res.json();
}
