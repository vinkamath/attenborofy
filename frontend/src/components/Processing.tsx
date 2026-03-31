import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { getJobStatus } from "@/lib/api";

const QUOTES = [
  "No one will protect what they don't care about; and no one will care about what they have never experienced.",
  "The natural world is full of extraordinary animals doing extraordinary things.",
  "It seems to me that the natural world is the greatest source of excitement.",
  "An understanding of the natural world is a source of not only great curiosity, but great fulfillment.",
  "The question is, are we happy to suppose that our grandchildren may never be able to see an elephant except in a picture book?",
  "People are not going to care about animal conservation unless they think that animals are worthwhile.",
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
    <div className="max-w-xl mx-auto px-4 py-16">
      <Card>
        <CardContent className="pt-8 pb-8 text-center space-y-8">
          {error ? (
            <>
              <div className="text-5xl">:(</div>
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  Something went wrong
                </h2>
                <p className="text-destructive">{error}</p>
              </div>
              <button
                className="text-sm text-primary underline"
                onClick={() => navigate("/")}
              >
                Try again
              </button>
            </>
          ) : (
            <>
              {/* Spinner */}
              <div className="flex justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-1">
                  Narrating your video...
                </h2>
              </div>

              {/* Step indicator */}
              <div className="space-y-2 text-left max-w-xs mx-auto">
                {STEPS.map((step, i) => (
                  <div
                    key={step.key}
                    className={`flex items-center gap-3 text-sm transition-colors ${
                      i < currentStep
                        ? "text-muted-foreground"
                        : i === currentStep
                          ? "text-foreground font-medium"
                          : "text-muted-foreground/40"
                    }`}
                  >
                    <span className="w-5 text-center">
                      {i < currentStep ? (
                        <span className="text-green-600">&#10003;</span>
                      ) : i === currentStep ? (
                        <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
                      ) : (
                        <span className="inline-block h-2 w-2 rounded-full bg-muted" />
                      )}
                    </span>
                    {step.label}
                  </div>
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-sm italic text-muted-foreground border-l-2 pl-4 text-left">
                "{quote}"
                <br />
                <span className="text-xs not-italic">
                  — Sir David Attenborough
                </span>
              </blockquote>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
