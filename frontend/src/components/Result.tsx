import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getNarration, getVideoUrl } from "@/lib/api";

export default function Result() {
  const { jobId } = useParams<{ jobId: string }>();
  const [narration, setNarration] = useState<string>("");

  useEffect(() => {
    if (!jobId) return;
    getNarration(jobId).then(setNarration).catch(() => {});
  }, [jobId]);

  if (!jobId) return null;

  const videoUrl = getVideoUrl(jobId);

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

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <a
          href={videoUrl}
          download={`attenborofy_${jobId}.mp4`}
          className={cn(buttonVariants({ size: "lg" }))}
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
