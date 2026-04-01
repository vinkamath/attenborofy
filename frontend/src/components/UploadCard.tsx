import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { getPublicAppConfig, uploadVideo, getJobStatus } from "@/lib/api";

const DEFAULT_LIMITS = { min: 0, max: 60 };
const ACCEPTED_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", "video/x-matroska"];

const STEPS = [
  { key: "Validating", label: "Checking if Sir David would approve" },
  { key: "Analyzing", label: "Studying the footage intently" },
  { key: "Writing", label: "Calling Sir David Attenborough" },
  { key: "Generating", label: "Recording the telephone conversation" },
  { key: "Creating", label: "Deciphering what he said through the static" },
  { key: "Composing", label: "Posting the final tape via Royal Mail" },
];

const QUOTES = [
  "I once ate a gas station sushi roll at 2am and honestly? No regrets.",
  "The secret to a long life is avoiding eye contact with seagulls. They know what they did.",
  "I have never trusted a man who doesn't cry at the end of a nature documentary. Especially mine.",
  "WiFi password? I don't believe in them. Nature has no passwords.",
];

function getStepIndex(progress: string): number {
  for (let i = STEPS.length - 1; i >= 0; i--) {
    if (progress.includes(STEPS[i].key)) return i;
  }
  return -1;
}

export default function UploadCard() {
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
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState("Starting...");
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  useEffect(() => {
    getPublicAppConfig()
      .then((c) => setDurationLimits({ min: c.video_min_duration_seconds, max: c.video_max_duration_seconds }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(async () => {
      try {
        const status = await getJobStatus(jobId);
        if (status.status === "complete") {
          clearInterval(interval);
          navigate(`/result/${jobId}`, { replace: true });
          return;
        }
        if (status.status === "error") {
          clearInterval(interval);
          setProcessingError(status.error || "Processing failed");
          return;
        }
        setProgress(status.progress);
      } catch { /* retry */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [jobId, navigate]);

  const validateAndSetFile = useCallback((f: File) => {
    setError(null);
    if (!ACCEPTED_TYPES.includes(f.type) && !f.name.match(/\.(mp4|mov|webm|avi|mkv)$/i)) {
      setError("Please upload a video file (mp4, mov, webm, avi, mkv).");
      return;
    }
    const { min: minSec, max: maxSec } = durationLimits;
    const url = URL.createObjectURL(f);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const d = video.duration;
      if (minSec > 0 && d < minSec) { setError(`Video is ${Math.round(d)}s. Minimum is ${minSec}s.`); return; }
      if (d > maxSec) { setError(`Video is ${Math.round(d)}s. Maximum is ${maxSec}s.`); return; }
      setDuration(Math.round(d));
      setFile(f);
      setPreview(URL.createObjectURL(f));
    };
    video.onerror = () => { URL.revokeObjectURL(url); setError("Could not read video file."); };
    video.src = url;
  }, [durationLimits]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) validateAndSetFile(f);
  }, [validateAndSetFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadVideo(file, context, setUploadProgress);
      setUploading(false);
      setJobId(result.job_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null); setPreview(null); setDuration(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const currentStep = getStepIndex(progress);

  if (jobId) {
    return (
      <div className="bg-card rounded-2xl shadow-sm border border-border p-6 flex flex-col gap-5">
        {processingError ? (
          <>
            <p className="text-sm font-medium text-destructive">Something went wrong</p>
            <p className="text-xs text-destructive">{processingError}</p>
            <button className="text-xs text-primary underline text-left" onClick={() => { setJobId(null); setProcessingError(null); }}>
              Try again
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary shrink-0" />
              <p className="text-sm font-medium text-foreground">Narrating your video…</p>
            </div>
            <div className="flex flex-col gap-2">
              {STEPS.map((step, i) => (
                <div key={step.key} className={`flex items-center gap-2.5 text-xs transition-colors ${
                  i < currentStep ? "text-muted-foreground" : i === currentStep ? "text-foreground font-medium" : "text-muted-foreground/35"
                }`}>
                  <span className="w-4 shrink-0 flex justify-center">
                    {i < currentStep ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ) : i === currentStep ? (
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    ) : (
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted" />
                    )}
                  </span>
                  {step.label}
                </div>
              ))}
            </div>
            <div className="border-t border-border" />
            <blockquote className="text-xs italic text-muted-foreground leading-relaxed">
              "{quote}"
              <span className="block not-italic mt-1">— Sir David Attenborough <span className="text-muted-foreground/60">(no really)</span></span>
            </blockquote>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-6 flex flex-col gap-5">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {!file ? (
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              <span className="md:hidden">Tap to upload video</span>
              <span className="hidden md:inline">Drop your video here</span>
            </p>
            <p className="text-xs text-muted-foreground">MP4, MOV, WebM · {durationLimits.min}–{durationLimits.max}s</p>
            <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) validateAndSetFile(f); }} />
          </div>
        ) : (
          <div className="space-y-2">
            {preview && <video src={preview} controls className="w-full rounded-xl max-h-48 object-contain bg-black" />}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="truncate max-w-[160px]">{file.name} · {duration}s · {(file.size / 1024 / 1024).toFixed(1)}MB</span>
              <button type="button" onClick={clearFile} className="text-muted-foreground hover:text-foreground transition-colors ml-2 shrink-0">Remove</button>
            </div>
          </div>
        )}

        <div className="border-t border-border" />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="context-new" className="text-sm font-medium text-foreground">
            Plot or character context <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Textarea id="context-new" placeholder='e.g. "My cat Mr. Whiskers stalking a laser pointer..."'
            value={context} onChange={(e) => setContext(e.target.value)} rows={3} className="resize-none text-sm" />
          <p className="text-xs text-muted-foreground">Names, locations, or backstory — anything that adds flavor.</p>
        </div>

        {error && <div className="text-xs text-destructive bg-destructive/8 rounded-lg px-3 py-2.5">{error}</div>}

        {uploading && (
          <div className="space-y-1.5">
            <Progress value={uploadProgress} />
            <p className="text-xs text-muted-foreground text-center">Uploading… {uploadProgress}%</p>
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={!file || uploading}>
          {uploading ? "Uploading…" : "Narrate this video"}
        </Button>
      </form>
    </div>
  );
}
