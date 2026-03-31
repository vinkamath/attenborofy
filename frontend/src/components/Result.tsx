import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getJobStatus, getNarration, getVideoUrl, redoNarration } from "@/lib/api";

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
  const [artifactsAvailable, setArtifactsAvailable] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    getNarration(jobId).then(setNarration).catch(() => {});
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    let mounted = true;
    getJobStatus(jobId)
      .then((status) => {
        if (!mounted) return;
        if (typeof status.expires_at === "number") {
          setExpiresAt(status.expires_at);
          setRemainingSeconds(
            typeof status.seconds_until_cleanup === "number"
              ? Math.max(0, status.seconds_until_cleanup)
              : Math.max(0, Math.floor(status.expires_at - Date.now() / 1000))
          );
        }
        setArtifactsAvailable(status.artifacts_available !== false);
      })
      .catch(() => {
        if (!mounted) return;
        setArtifactsAvailable(false);
        setRemainingSeconds(0);
      });
    return () => {
      mounted = false;
    };
  }, [jobId]);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const secs = Math.max(0, Math.floor(expiresAt - Date.now() / 1000));
      setRemainingSeconds(secs);
      if (secs <= 0) {
        setArtifactsAvailable(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!jobId) return null;

  const videoUrl = getVideoUrl(jobId);
  const expired = remainingSeconds !== null && (remainingSeconds <= 0 || !artifactsAvailable);
  const handleRedo = async () => {
    if (expired) return;
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Your Narrated Video
        </h1>
        <p className="text-muted-foreground">
          Sir David has spoken. Download before leaving — videos are temporary.
        </p>
      </div>

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

      {/* Countdown Timer */}
      {remainingSeconds !== null && (
        <p className="text-center text-sm text-muted-foreground">
          {expired
            ? "Artifacts expired and were cleaned up."
            : `Available for ${formatRemaining(remainingSeconds)}`}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <a
          href={videoUrl}
          download={`attenborofy_${jobId}.mp4`}
          className={cn(
            buttonVariants({ size: "lg" }),
            expired && "pointer-events-none opacity-50"
          )}
          aria-disabled={expired}
        >
          Download Video
        </a>
        <Link
          to="/"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          Narrate Another
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Redo with Different Narration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={redoContext}
            onChange={(e) => setRedoContext(e.target.value)}
            placeholder="Optional direction for the new narration..."
            disabled={expired || redoLoading}
            className={cn(
              "w-full min-h-24 rounded-md border bg-background px-3 py-2 text-sm",
              expired && "opacity-60"
            )}
          />
          {redoError ? (
            <p className="text-sm text-destructive">{redoError}</p>
          ) : expired ? (
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
            disabled={redoLoading || expired}
            onClick={handleRedo}
            className={cn(
              buttonVariants({ size: "lg" }),
              "w-full sm:w-auto",
              expired && "pointer-events-none opacity-50"
            )}
          >
            {expired ? "Redo Unavailable" : redoLoading ? "Starting redo..." : "Redo Narration"}
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
