import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { getPublicAppConfig, uploadVideo } from "@/lib/api";

const DEFAULT_LIMITS = { min: 0, max: 60 };
const ACCEPTED_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", "video/x-matroska"];

function durationLimitsLabel(min: number, max: number): string {
  return `Duration: ${min}–${max} seconds`;
}

export default function VideoUpload() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [context, setContext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [durationLimits, setDurationLimits] = useState(DEFAULT_LIMITS);

  useEffect(() => {
    getPublicAppConfig()
      .then((c) =>
        setDurationLimits({
          min: c.video_min_duration_seconds,
          max: c.video_max_duration_seconds,
        })
      )
      .catch(() => {
        /* dev without API: keep defaults */
      });
  }, []);

  const validateAndSetFile = useCallback(
    (f: File) => {
      setError(null);

      if (!ACCEPTED_TYPES.includes(f.type) && !f.name.match(/\.(mp4|mov|webm|avi|mkv)$/i)) {
        setError("Please upload a video file (mp4, mov, webm, avi, mkv).");
        return;
      }

      const { min: minSec, max: maxSec } = durationLimits;

      // Check duration via <video> element
      const url = URL.createObjectURL(f);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        const d = video.duration;
        if (minSec > 0 && d < minSec) {
          setError(
            `Video is ${Math.round(d)}s. Minimum is ${minSec} seconds.`
          );
          return;
        }
        if (d > maxSec) {
          setError(
            `Video is ${Math.round(d)}s. Maximum is ${maxSec} seconds.`
          );
          return;
        }
        setDuration(Math.round(d));
        setFile(f);
        setPreview(URL.createObjectURL(f));
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        setError("Could not read video file.");
      };
      video.src = url;
    },
    [durationLimits]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const f = e.dataTransfer.files[0];
      if (f) validateAndSetFile(f);
    },
    [validateAndSetFile]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const result = await uploadVideo(file, context, setUploadProgress);
      navigate(`/processing/${result.job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setDuration(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          Narrate Your Video
        </h1>
        <p className="text-muted-foreground text-lg">
          Upload a video and get it narrated in the style of Sir David Attenborough.
        </p>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Drop Zone */}
            {!file ? (
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-4xl mb-3">🎬</div>
                <p className="text-muted-foreground mb-1">
                  Drop your video here or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  MP4, MOV, WebM, AVI, MKV &middot;{" "}
                  {durationLimitsLabel(durationLimits.min, durationLimits.max)}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) validateAndSetFile(f);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-3">
                {preview && (
                  <video
                    src={preview}
                    controls
                    className="w-full rounded-lg max-h-72 object-contain bg-black"
                  />
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {file.name} &middot; {duration}s &middot;{" "}
                    {(file.size / 1024 / 1024).toFixed(1)}MB
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearFile}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}

            {/* Context */}
            <div className="space-y-2">
              <label
                htmlFor="context"
                className="text-sm font-medium leading-none"
              >
                Plot / Character Context{" "}
                <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="context"
                placeholder='e.g. "This is my cat Mr. Whiskers stalking a laser pointer in the living room"'
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                 Add names, locations or a
                backstory — anything that adds flavor to the narration.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-md px-4 py-3">
                {error}
              </div>
            )}

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-muted-foreground text-center">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={!file || uploading}
            >
              {uploading ? "Uploading..." : "Narrate This Video"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
