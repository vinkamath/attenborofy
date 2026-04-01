import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Logo from "@/components/Logo";
import UploadCard from "@/components/UploadCard";
import { getJobStatus, getNarration, getVideoUrl } from "@/lib/api";

export default function Result() {
  const { jobId } = useParams<{ jobId: string }>();
  const [narration, setNarration] = useState<string>("");
  const [videoAvailable, setVideoAvailable] = useState(true);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!jobId) return;
    getNarration(jobId).then(setNarration).catch(() => {});
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    let mounted = true;
    const refresh = async () => {
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
      } catch {
        if (!mounted) return;
        setVideoAvailable(false);
      }
    };
    void refresh();
    const poll = setInterval(refresh, 5000);
    return () => { mounted = false; clearInterval(poll); };
  }, [jobId]);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      setRemainingSeconds(Math.max(0, Math.floor(expiresAt - Date.now() / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const isDemo = jobId === "demo";

  if (!jobId) return null;

  const videoUrl = isDemo ? "" : getVideoUrl(jobId);
  const expired = !isDemo && remainingSeconds !== null && remainingSeconds <= 0;
  const downloadDisabled = isDemo || expired || !videoAvailable;
  const demoNarration = "Here, in the fluorescent wilderness of the open-plan office, the creature known as the domestic feline has claimed the standing desk as its own — an act of quiet, devastating dominance.";
  const displayNarration = isDemo ? demoNarration : narration;

  const downloadBtn = (
    <a
      href={videoUrl}
      download={`attenborofy_${jobId}.mp4`}
      aria-disabled={downloadDisabled}
      className={`flex items-center justify-center gap-2 w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
        downloadDisabled
          ? "bg-muted text-muted-foreground pointer-events-none"
          : "bg-primary text-primary-foreground hover:opacity-90"
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 2v7m0 0L4.5 6.5M7 9l2.5-2.5M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Download video
    </a>
  );

  return (
    <>
      {/* ── Mobile layout ── */}
      <div className="md:hidden flex flex-col min-h-screen">
        <div className="px-4 py-5">
          <Link to="/" className="no-underline block">
            <Logo />
          </Link>
        </div>

        {/* Portrait video full-width */}
        <div className="px-4">
          {isDemo ? (
            <div className="w-full rounded-2xl bg-muted" style={{ aspectRatio: "9/16" }} />
          ) : (
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full rounded-2xl bg-black object-contain"
              style={{ aspectRatio: "9/16" }}
            />
          )}
        </div>

        {/* Narration + action buttons */}
        <div className="px-4 py-6 flex flex-col gap-3">
          <div className="mb-1">
            <p className="font-semibold text-foreground mb-1">Your narrated video</p>
            {displayNarration && (
              <p className="text-sm text-muted-foreground leading-relaxed">{displayNarration}</p>
            )}
          </div>

          {/* Primary */}
          {downloadBtn}

          {/* Secondary */}
          <button
            disabled
            className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-2.5 text-sm font-medium border border-border bg-background text-muted-foreground pointer-events-none"
          >
            Add to gallery
          </button>

          {/* Tertiary */}
          <Link
            to="/"
            className="flex items-center justify-center w-full rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Narrate another
          </Link>
        </div>
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden md:flex h-screen flex-col px-8 py-8 gap-8">
        <Link to="/" className="no-underline block shrink-0">
          <Logo />
        </Link>

        <div className="flex-1 flex gap-8 overflow-hidden min-h-0">
          {/* Left: Upload another */}
          <div className="shrink-0 w-[325px]">
            <UploadCard />
          </div>

          {/* Middle: narration + download */}
          <div className="w-[260px] shrink-0 flex flex-col justify-end gap-4 ml-auto">
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Your narrated video</p>
              {displayNarration && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                  {displayNarration}
                </p>
              )}
            </div>
            {downloadBtn}
          </div>

          {/* Right: video */}
          <div className="flex-1 flex items-center justify-end min-w-0">
            {isDemo ? (
              <div className="h-full max-w-full rounded-2xl bg-muted" style={{ aspectRatio: "9/16" }} />
            ) : (
              <video
                src={videoUrl}
                controls
                autoPlay
                className="h-full max-w-full rounded-2xl bg-black object-contain"
                style={{ aspectRatio: "9/16" }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
