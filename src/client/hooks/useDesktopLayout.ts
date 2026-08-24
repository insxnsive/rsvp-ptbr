import { useEffect, useState } from "preact/hooks";

type LayoutStore = {
  query: MediaQueryList;
  subscribers: Set<() => void>;
  notify: () => void;
};

const layoutStores = new Map<number, LayoutStore>();

function getLayoutStore(minWidth: number): LayoutStore | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }
  const existing = layoutStores.get(minWidth);
  if (existing) return existing;
  const query = window.matchMedia(`(min-width: ${minWidth}px)`);
  const subscribers = new Set<() => void>();
  const store: LayoutStore = {
    query,
    subscribers,
    notify: () => subscribers.forEach((subscriber) => subscriber())
  };
  layoutStores.set(minWidth, store);
  return store;
}

export function useDesktopLayout(minWidth = 1024): boolean {
  const [desktop, setDesktop] = useState(() => getLayoutStore(minWidth)?.query.matches ?? false);

  useEffect(() => {
    const store = getLayoutStore(minWidth);
    if (!store) return undefined;
    const update = () => setDesktop(store.query.matches);
    if (store.subscribers.size === 0) store.query.addEventListener("change", store.notify);
    store.subscribers.add(update);
    update();
    return () => {
      store.subscribers.delete(update);
      if (store.subscribers.size === 0) store.query.removeEventListener("change", store.notify);
    };
  }, [minWidth]);

  return desktop;
}
