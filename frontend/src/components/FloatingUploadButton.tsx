import { useCallback, useEffect, useState, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog } from "@base-ui/react/dialog";
import { Upload, X, Check, AlertCircle } from "lucide-react";
import Logo from "@/components/Logo";
import UploadCard from "@/components/UploadCard";
import { getJobStatus } from "@/lib/api";
import { PROCESSING_STEPS, getStepIndex } from "@/lib/processing-steps";

type JobState =
  | { phase: "idle" }
  | { phase: "processing"; jobId: string; progress: string }
  | { phase: "complete"; jobId: string }
  | { phase: "error"; jobId: string; message: string };

export default function FloatingUploadButton({
  heroRef,
}: {
  heroRef: RefObject<HTMLElement | null>;
}) {
  const navigate = useNavigate();
  const [showFab, setShowFab] = useState(false);
  const [open, setOpen] = useState(false);
  const [job, setJob] = useState<JobState>({ phase: "idle" });

  // Observe hero section visibility
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowFab(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [heroRef]);

  // Poll job status while processing
  useEffect(() => {
    if (job.phase !== "processing") return;
    const interval = setInterval(async () => {
      try {
        const status = await getJobStatus(job.jobId);
        if (status.status === "complete") {
          clearInterval(interval);
          setJob({ phase: "complete", jobId: job.jobId });
        } else if (status.status === "error") {
          clearInterval(interval);
          setJob({ phase: "error", jobId: job.jobId, message: status.error || "Processing failed" });
        } else {
          setJob({ phase: "processing", jobId: job.jobId, progress: status.progress });
        }
      } catch {
        // Retry on network errors
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [job]);

  const handleUploadSuccess = useCallback((jobId: string) => {
    setJob({ phase: "processing", jobId, progress: "Starting..." });
    setOpen(false);
  }, []);

  const handlePillTap = () => {
    if (job.phase === "complete") {
      navigate(`/result/${job.jobId}`);
    } else if (job.phase === "error") {
      setJob({ phase: "idle" });
    }
  };

  const isVisible = showFab || job.phase === "processing" || job.phase === "complete" || job.phase === "error";
  const showPill = job.phase === "processing" || job.phase === "complete" || job.phase === "error";

  const currentStep = job.phase === "processing" ? getStepIndex(job.progress) : -1;
  const currentLabel =
    job.phase === "processing" && currentStep >= 0
      ? PROCESSING_STEPS[currentStep].label
      : job.phase === "processing"
        ? "Starting..."
        : "";

  return (
    <div className="md:hidden">
      <Dialog.Root open={open} onOpenChange={setOpen}>
        {/* Progress pill — replaces FAB while a job is active */}
        {showPill && (
          <button
            onClick={handlePillTap}
            className={`fixed bottom-6 right-4 left-4 z-50 flex items-center gap-3 rounded-2xl shadow-lg px-4 py-3 transition-all duration-300 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
            } ${
              job.phase === "complete"
                ? "bg-primary text-primary-foreground"
                : job.phase === "error"
                  ? "bg-destructive text-white"
                  : "bg-card border border-border text-foreground"
            }`}
          >
            {job.phase === "processing" && (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">Narrating your video…</p>
                  <p className="text-xs text-muted-foreground truncate">{currentLabel}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {currentStep + 1}/{PROCESSING_STEPS.length}
                </span>
              </>
            )}
            {job.phase === "complete" && (
              <>
                <Check className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">Your video is ready — tap to view</span>
              </>
            )}
            {job.phase === "error" && (
              <>
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium flex-1 truncate">Failed — tap to dismiss</span>
              </>
            )}
          </button>
        )}

        {/* FAB — hidden while pill is showing */}
        {!showPill && (
          <Dialog.Trigger
            className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-all duration-300 ${
              isVisible
                ? "opacity-100 scale-100"
                : "opacity-0 scale-75 pointer-events-none"
            }`}
            aria-label="Upload video"
          >
            <Upload className="w-6 h-6" />
          </Dialog.Trigger>
        )}

        <Dialog.Portal keepMounted>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 transition-opacity duration-200 data-[open]:opacity-100 data-[closed]:opacity-0" />
          <Dialog.Popup className="fixed inset-0 z-50 bg-background flex flex-col transition-transform duration-300 ease-out data-[open]:translate-y-0 data-[closed]:translate-y-full">
            <div className="px-8 pt-8 flex items-center justify-between">
              <Dialog.Title>
                <Logo />
              </Dialog.Title>
              <Dialog.Close className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>
            <div className="px-8 pb-8 flex-1 flex items-center">
              <UploadCard onUploadSuccess={handleUploadSuccess} />
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
