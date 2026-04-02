import { useEffect, useState } from "react";
import { type GalleryItem, getGallery, getPublicAppConfig } from "@/lib/api";
import LazyVideo from "@/components/LazyVideo";

export default function HomeGallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [galleryEnabled, setGalleryEnabled] = useState(true);

  useEffect(() => {
    Promise.all([getPublicAppConfig(), getGallery()])
      .then(([cfg, galleryItems]) => {
        setGalleryEnabled(cfg.gallery_enabled);
        setItems(galleryItems);
      })
      .catch(() => {});
  }, []);

  if (items.length === 0) {
    const emptyMessage = galleryEnabled
      ? "Gallery videos will appear here"
      : "Community gallery is unavailable — Azure Blob Storage is not configured for this deployment.";
    return (
      <>
        <div className="hidden md:flex h-full items-center justify-center px-4">
          <p className="text-sm text-muted-foreground/40 text-center max-w-xs">{emptyMessage}</p>
        </div>
        <div className="md:hidden px-4 py-8 text-center text-muted-foreground/40">
          <p className="text-sm">{emptyMessage}</p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Desktop: snap-scroll without duplicated video DOM */}
      <div
        className="hidden md:block h-full overflow-y-scroll"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className="h-full flex items-center justify-center"
            style={{ scrollSnapAlign: "start" }}
          >
            <div className="flex items-end gap-4 py-6 h-full">
              <LazyVideo
                src={item.video_url}
                poster={item.thumbnail_url || undefined}
                preload="metadata"
                className="h-full rounded-2xl bg-black shrink-0"
                mediaClassName="w-full h-full object-contain rounded-2xl"
                style={{ aspectRatio: "9/16" }}
              />
              <div className="pb-2 hidden lg:block lg:w-44 xl:w-56 2xl:w-64">
                <p className="text-sm font-semibold text-foreground mb-1">{item.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: vertical list */}
      <div className="md:hidden px-4 py-4 flex flex-col gap-4">
        {items.map((item, i) => (
          <div key={i} className="flex flex-col gap-2">
            <LazyVideo
              src={item.video_url}
              poster={item.thumbnail_url || undefined}
              preload="metadata"
              className="w-full rounded-2xl bg-black"
              mediaClassName="w-full h-full object-contain rounded-2xl"
              style={{ aspectRatio: "9/16" }}
            />
            <div className="px-1">
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
