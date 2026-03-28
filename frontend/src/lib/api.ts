export interface UploadResponse {
  job_id: string;
  error?: string;
}

export interface JobStatus {
  status: "pending" | "processing" | "complete" | "error";
  progress: string;
  error: string | null;
}

export interface GalleryItem {
  title: string;
  description: string;
  video: string;
  thumbnail: string;
}

export async function uploadVideo(
  file: File,
  context: string,
  onProgress?: (pct: number) => void
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("video", file);
    formData.append("context", context);

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

export function getGalleryFileUrl(filename: string): string {
  return `/api/gallery/${filename}`;
}
