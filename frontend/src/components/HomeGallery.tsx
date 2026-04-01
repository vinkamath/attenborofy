import { useEffect, useRef } from "react";

const EXAMPLES = [
  { title: "Office Cat", plot: "Mr. Biscuits navigates the treacherous terrain of a standing desk, stalking a rogue cursor with singular focus." },
  { title: "The Morning Commute", plot: "A lone human braves the concrete savanna of rush hour, fighting for position on the downtown express." },
  { title: "Pizza Night", plot: "The family gathers in ritual around the flat disc of sustenance, each member jostling for the final slice." },
  { title: "Dog at the Park", plot: "Rufus, a golden retriever of considerable ambition, attempts to befriend every creature within a 50-metre radius." },
  { title: "Baby's First Steps", plot: "The young one ventures upright for the first time, defying gravity with sheer determination and wobbly knees." },
  { title: "The Afternoon Nap", plot: "A tabby of great wisdom retreats to the sunlit corner of the sofa, entering a state of profound horizontal contemplation." },
  { title: "Grocery Run", plot: "Armed with a crumpled list, our subject ventures into the fluorescent wilderness of the supermarket at peak hour." },
  { title: "Bath Time", plot: "The small human resists the cleansing ritual with every fibre of its being, deploying tears as its primary defence." },
  { title: "The Backyard BBQ", plot: "The patriarch presides over the sacred grill, asserting dominance over fire and meat in equal measure." },
  { title: "First Day of School", plot: "The young one crosses the threshold into the great institution, backpack towering, chin trembling with quiet resolve." },
];

// Triplicate so we can seamlessly jump back to the middle set
const FEED = [...EXAMPLES, ...EXAMPLES, ...EXAMPLES];
const COUNT = EXAMPLES.length;

export default function HomeGallery() {
  const ref = useRef<HTMLDivElement>(null);

  // On mount, jump to the middle copy so scrolling up and down both work
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.clientHeight * COUNT;
  }, []);

  // When near either end, silently teleport to the middle copy
  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    const h = el.clientHeight;
    if (el.scrollTop < h * (COUNT * 0.5)) {
      el.scrollTop += h * COUNT;
    } else if (el.scrollTop > h * (COUNT * 2 - 0.5)) {
      el.scrollTop -= h * COUNT;
    }
  };

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="h-full overflow-y-scroll"
      style={{ scrollSnapType: "y mandatory" }}
    >
      {FEED.map((item, i) => (
        <div
          key={i}
          className="h-full flex"
          style={{ scrollSnapAlign: "start" }}
        >
          {/* Left — caption pinned to bottom */}
          <div className="flex-1 flex flex-col justify-end py-10 px-8">
            <p className="text-sm font-semibold text-foreground mb-1">{item.title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">{item.plot}</p>
          </div>

          {/* Right — portrait video placeholder */}
          <div className="flex items-center py-6 pr-8">
            <div
              className="h-full rounded-2xl bg-muted"
              style={{ aspectRatio: "9/16" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
