import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Logo from "@/components/Logo";
import { type GalleryItem, addToGallery, getJobStatus, getNarration, getVideoUrl, redoNarration } from "@/lib/api";

export default function Result() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [narration, setNarration] = useState<string>("");
  const [videoAvailable, setVideoAvailable] = useState(true);
  const [redoAvailable, setRedoAvailable] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [redoContext, setRedoContext] = useState("");
  const [redoLoading, setRedoLoading] = useState(false);
  const [redoError, setRedoError] = useState<string | null>(null);
  const [showGalleryForm, setShowGalleryForm] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState("");
  const [gallerySubmitting, setGallerySubmitting] = useState(false);
  const [galleryItem, setGalleryItem] = useState<GalleryItem | null>(null);
  const [galleryError, setGalleryError] = useState<string | null>(null);

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
        setRedoAvailable(status.redo_available === true);
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

  if (!jobId) return null;

  const videoUrl = getVideoUrl(jobId);
  const displayVideoUrl = galleryItem ? galleryItem.video_url : videoUrl;
  const expired = remainingSeconds !== null && remainingSeconds <= 0;
  const downloadDisabled = expired || !videoAvailable;

  const formatRemaining = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (h > 0) return ` (${h}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")})`;
    return ` (${min}:${String(sec).padStart(2, "0")})`;
  };
  const countdownLabel = remainingSeconds !== null && remainingSeconds > 0 ? formatRemaining(remainingSeconds) : "";

  const handleRedo = async () => {
    if (!jobId) return;
    setRedoLoading(true);
    setRedoError(null);
    try {
      const result = await redoNarration(jobId, redoContext);
      navigate(`/processing/${result.job_id}`);
    } catch (err) {
      setRedoError(err instanceof Error ? err.message : "Something went wrong");
      setRedoLoading(false);
    }
  };

  const showRedo = !expired && redoAvailable;

  const redoSection = showRedo ? (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-foreground">Redo narration</p>
      <textarea
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        rows={3}
        placeholder="Optional: describe what to focus on (e.g. 'highlight the dog')"
        value={redoContext}
        onChange={(e) => setRedoContext(e.target.value)}
        disabled={redoLoading}
      />
      {redoError && <p className="text-xs text-destructive">{redoError}</p>}
      <button
        onClick={handleRedo}
        disabled={redoLoading}
        className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-2.5 text-sm font-medium border border-border bg-background text-foreground hover:bg-muted transition-colors disabled:opacity-50"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1.5 7A5.5 5.5 0 1 0 3 3.5M1.5 1v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {redoLoading ? "Starting…" : `Redo narration${countdownLabel}`}
      </button>
    </div>
  ) : null;

  const handleAddToGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryTitle.trim() || !jobId) return;
    setGallerySubmitting(true);
    setGalleryError(null);
    try {
      const item = await addToGallery(jobId, galleryTitle.trim());
      setGalleryItem(item);
      setShowGalleryForm(false);
    } catch (err) {
      setGalleryError(err instanceof Error ? err.message : "Failed to add to gallery");
    } finally {
      setGallerySubmitting(false);
    }
  };

  const gallerySection = !expired && videoAvailable ? (
    <div className="flex flex-col gap-2">
      {galleryItem ? (
        <Link
          to="/gallery"
          className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-2.5 text-sm font-medium border border-green-600 text-green-600 hover:bg-green-50 transition-colors"
        >
          Added to Gallery
        </Link>
      ) : showGalleryForm ? (
        <form onSubmit={handleAddToGallery} className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Give your video a title"
            value={galleryTitle}
            onChange={(e) => setGalleryTitle(e.target.value)}
            maxLength={100}
            autoFocus
            disabled={gallerySubmitting}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {galleryError && <p className="text-xs text-destructive">{galleryError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!galleryTitle.trim() || gallerySubmitting}
              className="flex-1 rounded-xl px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {gallerySubmitting ? "Adding..." : "Submit"}
            </button>
            <button
              type="button"
              onClick={() => { setShowGalleryForm(false); setGalleryError(null); }}
              disabled={gallerySubmitting}
              className="rounded-xl px-4 py-2 text-sm font-medium border border-border bg-background text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowGalleryForm(true)}
          className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-2.5 text-sm font-medium border border-border bg-background text-foreground hover:bg-muted transition-colors"
        >
          Add to Gallery
        </button>
      )}
    </div>
  ) : null;

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
      {`Download video${countdownLabel}`}
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

        <div className="px-4">
          <video
            src={displayVideoUrl}
            controls
            autoPlay={!galleryItem}
            className="w-full rounded-2xl bg-black object-contain"
            style={{ aspectRatio: "9/16" }}
          />
        </div>

        <div className="px-4 py-6 flex flex-col gap-3">
          <div className="mb-1">
            <p className="font-semibold text-foreground mb-1">Your narrated video</p>
            {narration && (
              <p className="text-sm text-muted-foreground leading-relaxed">{narration}</p>
            )}
          </div>
          {downloadBtn}
          {redoSection}
          {gallerySection}
        </div>
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden md:flex h-screen flex-row overflow-hidden">
        {/* Left panel */}
        <div className="w-[380px] shrink-0 flex flex-col px-8 py-8 overflow-y-auto">
          <div className="mb-8">
            <Link to="/" className="no-underline block">
              <Logo />
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Your narrated video</p>
              {narration && (
                <p className="text-xs text-muted-foreground leading-relaxed">{narration}</p>
              )}
            </div>
            {downloadBtn}
            {redoSection}
            {gallerySection}
          </div>
        </div>

        {/* Right canvas — video */}
        <div className="flex-1 overflow-hidden flex items-center justify-center py-6 px-8">
          <div className="flex items-end gap-4 h-full">
            <video
              src={displayVideoUrl}
              controls
              autoPlay={!galleryItem}
              className="h-full rounded-2xl bg-black object-contain shrink-0"
              style={{ aspectRatio: "9/16" }}
            />
            {galleryItem && (
              <div className="pb-2 hidden lg:block lg:w-44 xl:w-56 2xl:w-64">
                <p className="text-sm font-semibold text-foreground mb-1">{galleryItem.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{galleryItem.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
