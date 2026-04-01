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

  return (
    <div className="h-screen flex">
      {/* Left panel */}
      <div className="w-[380px] shrink-0 flex flex-col px-8 py-8 overflow-y-auto">
        <Link to="/" className="no-underline mb-8 block">
          <Logo />
        </Link>

        {/* Title + narration */}
        <div className="flex-1 flex flex-col justify-end pb-6">
          <p className="text-sm font-semibold text-foreground mb-1">Your narrated video</p>
          {displayNarration && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
              {displayNarration}
            </p>
          )}
        </div>

        {/* Download button */}
        <a
          href={videoUrl}
          download={`attenborofy_${jobId}.mp4`}
          aria-disabled={downloadDisabled}
          className={`flex items-center justify-center gap-2 w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-colors mb-6 ${
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

        {/* Upload another */}
        <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-widest">Narrate another</p>
        <UploadCard />
      </div>

      {/* Right — video fills height like gallery */}
      <div className="flex-1 flex items-center justify-center py-6 pr-8 pl-2">
        {isDemo ? (
          <div className="h-full rounded-2xl bg-muted" style={{ aspectRatio: "9/16" }} />
        ) : (
          <video
            src={videoUrl}
            controls
            autoPlay
            className="h-full rounded-2xl bg-black object-contain"
            style={{ aspectRatio: "9/16" }}
          />
        )}
      </div>
    </div>
  );
}
