import { useEffect, useState } from "preact/hooks";

export function useDesktopLayout(minWidth = 1024): boolean {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== "undefined" && "matchMedia" in window
      ? window.matchMedia(`(min-width: ${minWidth}px)`).matches
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) {
      return undefined;
    }
    const query = window.matchMedia(`(min-width: ${minWidth}px)`);
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [minWidth]);

  return desktop;
}
