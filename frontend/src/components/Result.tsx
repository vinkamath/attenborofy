import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { addToGallery, getJobStatus, getNarration, getVideoUrl, redoNarration } from "@/lib/api";

function formatRemaining(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Result() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [narration, setNarration] = useState<string>("");
  const [redoContext, setRedoContext] = useState<string>("");
  const [redoError, setRedoError] = useState<string | null>(null);
  const [redoLoading, setRedoLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [videoAvailable, setVideoAvailable] = useState(true);
  const [redoAvailable, setRedoAvailable] = useState(true);
  const [showGalleryForm, setShowGalleryForm] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [addedToGallery, setAddedToGallery] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    getNarration(jobId).then(setNarration).catch(() => {});
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    let mounted = true;

    const refreshStatus = async () => {
      try {
        const status = await getJobStatus(jobId);
        if (!mounted) return;
        if (typeof status.expires_at === "number") {
          setExpiresAt(status.expires_at);
          setRemainingSeconds(
            typeof status.seconds_until_cleanup === "number"
              ? Math.max(0, status.seconds_until_cleanup)
              : Math.max(0, Math.floor(status.expires_at - Date.now() / 1000))
          );
        }
        setVideoAvailable(status.video_available !== false);
        setRedoAvailable(status.redo_available !== false);
      } catch {
        if (!mounted) return;
        setVideoAvailable(false);
        setRedoAvailable(false);
        setRemainingSeconds(0);
      }
    };

    void refreshStatus();
    const pollInterval = setInterval(() => {
      void refreshStatus();
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
    };
  }, [jobId]);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const secs = Math.max(0, Math.floor(expiresAt - Date.now() / 1000));
      setRemainingSeconds(secs);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!jobId) return null;

  const videoUrl = getVideoUrl(jobId);
  const timeExpired = remainingSeconds !== null && remainingSeconds <= 0;
  const downloadDisabled = timeExpired || !videoAvailable;
  const redoDisabled = timeExpired || !redoAvailable;
  const countdownLabel =
    remainingSeconds !== null && !timeExpired ? ` (${formatRemaining(remainingSeconds)})` : "";
  const handleRedo = async () => {
    if (redoDisabled) return;
    try {
      setRedoLoading(true);
      setRedoError(null);
      const resp = await redoNarration(jobId, redoContext);
      navigate(`/processing/${resp.job_id}`);
    } catch (err) {
      setRedoError(err instanceof Error ? err.message : "Failed to redo narration");
    } finally {
      setRedoLoading(false);
    }
  };

  const handleAddToGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryTitle.trim()) return;
    setSubmitting(true);
    setGalleryError(null);
    try {
      await addToGallery(jobId, galleryTitle.trim());
      setAddedToGallery(true);
      setShowGalleryForm(false);
    } catch (err) {
      setGalleryError(
        err instanceof Error ? err.message : "Failed to add to gallery"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      {/* Video Player */}
      <Card>
        <CardContent className="p-0">
          <video
            src={videoUrl}
            controls
            autoPlay
            className="w-full rounded-lg"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <a
          href={videoUrl}
          download={`attenborofy_${jobId}.mp4`}
          className={cn(
            buttonVariants({ size: "lg" }),
            downloadDisabled && "pointer-events-none opacity-50"
          )}
          aria-disabled={downloadDisabled}
        >
          {`Download video${countdownLabel}`}
        </a>
        <Link
          to="/"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          Narrate Another
        </Link>
        {!addedToGallery && !showGalleryForm && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowGalleryForm(true)}
          >
            Add to Gallery
          </Button>
        )}
        {addedToGallery && (
          <Link
            to="/gallery"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "text-green-600 border-green-600 hover:text-green-700"
            )}
          >
            Added to Gallery
          </Link>
        )}
      </div>

      {/* Add to Gallery Form */}
      {showGalleryForm && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleAddToGallery} className="space-y-3">
              <label
                htmlFor="gallery-title"
                className="text-sm font-medium leading-none"
              >
                Give your video a title
              </label>
              <Input
                id="gallery-title"
                placeholder="e.g. My cat stalking a laser pointer"
                value={galleryTitle}
                onChange={(e) => setGalleryTitle(e.target.value)}
                maxLength={100}
                autoFocus
                disabled={submitting}
              />
              {galleryError && (
                <p className="text-sm text-destructive">{galleryError}</p>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={!galleryTitle.trim() || submitting}>
                  {submitting ? "Adding..." : "Submit"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowGalleryForm(false);
                    setGalleryError(null);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Redo with Different Narration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={redoContext}
            onChange={(e) => setRedoContext(e.target.value)}
            placeholder="Optional direction for the new narration..."
            disabled={redoDisabled || redoLoading}
            className={cn(
              "w-full min-h-24 rounded-md border bg-background px-3 py-2 text-sm",
              redoDisabled && "opacity-60"
            )}
          />
          {redoError ? (
            <p className="text-sm text-destructive">{redoError}</p>
          ) : redoDisabled ? (
            <p className="text-sm text-muted-foreground">
              Redo is unavailable because this video has been cleaned up.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Reuses your video analysis and regenerates voiceover + subtitles.
            </p>
          )}
          <button
            type="button"
            disabled={redoLoading || redoDisabled}
            onClick={handleRedo}
            className={cn(
              buttonVariants({ size: "lg" }),
              "w-full sm:w-auto",
              redoDisabled && "pointer-events-none opacity-50"
            )}
          >
            {redoDisabled
              ? "Redo Unavailable"
              : redoLoading
                ? `Starting redo...${countdownLabel}`
                : `Redo Narration${countdownLabel}`}
          </button>
        </CardContent>
      </Card>

      {/* Narration Text */}
      {narration && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Narration Script</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed italic">
                "{narration}"
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
