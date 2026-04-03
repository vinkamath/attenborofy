import { useSyncExternalStore } from "react";

const MD_UP = "(min-width: 768px)";

function subscribeMdUp(onChange: () => void) {
  const mq = window.matchMedia(MD_UP);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getMdUpSnapshot() {
  return window.matchMedia(MD_UP).matches;
}

function getMdUpServerSnapshot() {
  return false;
}

/** True when viewport is md breakpoint or wider (Tailwind `md:`). */
export function useIsMdUp(): boolean {
  return useSyncExternalStore(subscribeMdUp, getMdUpSnapshot, getMdUpServerSnapshot);
}
