import { type CSSProperties, useEffect, useRef, useState } from "react";

type LazyVideoProps = {
  src: string;
  poster?: string;
  className?: string;
  mediaClassName?: string;
  style?: CSSProperties;
  controls?: boolean;
  preload?: "none" | "metadata" | "auto";
};

export default function LazyVideo({
  src,
  poster,
  className,
  mediaClassName,
  style,
  controls = true,
  preload = "metadata",
}: LazyVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || isVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isVisible]);

  return (
    <div ref={containerRef} className={className} style={style}>
      {isVisible ? (
        <video
          src={src}
          poster={poster}
          controls={controls}
          preload={preload}
          className={mediaClassName ?? "w-full h-full"}
        />
      ) : poster ? (
        <img src={poster} alt="" className={mediaClassName ?? "w-full h-full"} loading="lazy" />
      ) : (
        <div className="w-full h-full bg-black/70" />
      )}
    </div>
  );
}
