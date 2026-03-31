import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
import { addToGallery, getNarration, getVideoUrl } from "@/lib/api";

export default function Result() {
  const { jobId } = useParams<{ jobId: string }>();
  const [narration, setNarration] = useState<string>("");
  const [showGalleryForm, setShowGalleryForm] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [addedToGallery, setAddedToGallery] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    getNarration(jobId).then(setNarration).catch(() => {});
  }, [jobId]);

  if (!jobId) return null;

  const videoUrl = getVideoUrl(jobId);

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
      <div className="flex flex-wrap gap-3 justify-center">
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
