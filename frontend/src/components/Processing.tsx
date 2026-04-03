import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Logo from "@/components/Logo";
import HomeGallery from "@/components/HomeGallery";
import { getJobStatus } from "@/lib/api";

const QUOTES = [
  "I once arm-wrestled a gorilla in Rwanda. We don't talk about who won, but I will say he hasn't returned my calls.",
  "The BBC pays me exclusively in marmalade. I have not questioned this arrangement.",
  "Every Tuesday at 3pm I scream into a conch shell. It is not for the documentary. It is personal.",
  "I invented the concept of 'outside.' Before me, everyone simply stayed indoors and guessed what birds looked like.",
  "My doctor says I need to stop licking frogs. I say my doctor needs to stop being a coward.",
  "I can communicate with exactly one species of beetle, but he's incredibly boring so I never do.",
];

const STEPS = [
  { key: "Validating", label: "Checking if Sir David would approve" },
  { key: "Analyzing", label: "Studying the footage intently" },
  { key: "Writing", label: "Calling Sir David Attenborough" },
  { key: "Generating", label: "Recording the telephone conversation" },
  { key: "Creating", label: "Deciphering what he said through the static" },
  { key: "Composing", label: "Posting the final tape via Royal Mail" },
];

function getStepIndex(progress: string): number {
  for (let i = STEPS.length - 1; i >= 0; i--) {
    if (progress.includes(STEPS[i].key)) return i;
  }
  return -1;
}

export default function Processing() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [progress, setProgress] = useState("Starting...");
  const [error, setError] = useState<string | null>(null);
  const [quote] = useState(
    () => QUOTES[Math.floor(Math.random() * QUOTES.length)]
  );

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
          setError(status.error || "Processing failed");
          return;
        }

        setProgress(status.progress);
      } catch {
        // Retry on network errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, navigate]);

  const currentStep = getStepIndex(progress);

  return (
    <div className="flex flex-col md:h-screen md:flex-row md:overflow-hidden">
      <div className="md:w-[380px] shrink-0 flex flex-col px-8 py-8 md:overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="no-underline">
            <Logo />
          </Link>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 flex flex-col gap-5">
          {error ? (
            <>
              <p className="text-sm font-medium text-destructive">Something went wrong</p>
              <p className="text-xs text-destructive">{error}</p>
              <button
                className="text-xs text-primary underline text-left"
                onClick={() => navigate("/")}
              >
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
                  <div
                    key={step.key}
                    className={`flex items-center gap-2.5 text-xs transition-colors ${
                      i < currentStep
                        ? "text-muted-foreground"
                        : i === currentStep
                          ? "text-foreground font-medium"
                          : "text-muted-foreground/35"
                    }`}
                  >
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
                <span className="block not-italic mt-1">— Sir David Attenborough</span>
              </blockquote>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 md:overflow-hidden">
        <HomeGallery />
      </div>
    </div>
  );
}
