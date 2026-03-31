import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type GalleryItem, getGallery } from "@/lib/api";

export default function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGallery()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-3">Gallery</h1>
        <p className="text-muted-foreground text-lg">
          Sample videos narrated by our AI David Attenborough
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">
          Loading gallery...
        </div>
      ) : items.length === 0 ? (
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="text-5xl">🎬</div>
            <div>
              <h3 className="font-semibold text-lg mb-1">
                No videos yet
              </h3>
              <p className="text-muted-foreground text-sm">
                Be the first to share! Upload a video, get it narrated,
                and add it to the gallery.
              </p>
            </div>
            <Link to="/" className={cn(buttonVariants())}>
              Upload a Video
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <Card key={item.id ?? i} className="overflow-hidden">
              <CardContent className="p-0">
                <video
                  src={item.video_url}
                  poster={item.thumbnail_url || undefined}
                  controls
                  preload="metadata"
                  className="w-full aspect-video object-cover"
                />
              </CardContent>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
