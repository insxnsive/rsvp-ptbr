import { useEffect, useMemo, useState } from "preact/hooks";
import type { EventSummary } from "../types.js";

function eventQueryValue(): string {
  return new URLSearchParams(window.location.search).get("event") ?? "";
}

export function setEventQuery(pathname: string, slug?: string): void {
  const url = slug ? `${pathname}?event=${encodeURIComponent(slug)}` : pathname;
  window.history.replaceState(null, "", url);
}

export function useEventSelection(events: EventSummary[], pathname: string) {
  const [selectedId, setSelectedId] = useState("");
  const initialSlug = useMemo(() => eventQueryValue(), []);

  const selected = events.find((event) => event.id === selectedId) ?? events[0];

  useEffect(() => {
    if (selected?.slug) {
      setEventQuery(pathname, selected.slug);
    }
  }, [selected?.slug, pathname]);

  return { selected, selectedId, setSelectedId, initialSlug };
}
