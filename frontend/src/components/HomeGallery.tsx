import { useEffect, useRef, useState } from "react";
import { type GalleryItem, getGallery } from "@/lib/api";

export default function HomeGallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getGallery().then(setItems).catch(() => {});
  }, []);

  // Triplicate for seamless infinite scroll
  const feed = items.length > 0 ? [...items, ...items, ...items] : [];
  const count = items.length;

  // On mount or when items load, jump to the middle copy
  useEffect(() => {
    const el = ref.current;
    if (!el || count === 0) return;
    // Wait a frame so the DOM has rendered the feed
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight / 3;
    });
  }, [count]);

  // When near either end, silently teleport to the middle copy
  const handleScroll = () => {
    const el = ref.current;
    if (!el || count === 0) return;
    const third = el.scrollHeight / 3;
    if (el.scrollTop < third * 0.25) {
      el.scrollTop += third;
    } else if (el.scrollTop > third * 1.75) {
      el.scrollTop -= third;
    }
  };

  if (items.length === 0) {
    return (
      <>
        <div className="hidden md:flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground/40">Gallery videos will appear here</p>
        </div>
        <div className="md:hidden px-4 py-8 text-center text-muted-foreground/40">
          <p className="text-sm">Gallery videos will appear here</p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Desktop: infinite snap-scroll */}
      <div
        ref={ref}
        onScroll={handleScroll}
        className="hidden md:block h-full overflow-y-scroll"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {feed.map((item, i) => (
          <div
            key={i}
            className="h-full flex items-center justify-center"
            style={{ scrollSnapAlign: "start" }}
          >
            <div className="flex items-end gap-4 py-6 h-full">
              <video
                src={item.video_url}
                poster={item.thumbnail_url || undefined}
                controls
                preload="metadata"
                className="h-full rounded-2xl bg-black object-contain shrink-0"
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
            <video
              src={item.video_url}
              poster={item.thumbnail_url || undefined}
              controls
              preload="metadata"
              className="w-full rounded-2xl bg-black object-contain"
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
