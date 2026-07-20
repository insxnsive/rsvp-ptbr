import { useEffect, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";

type RouteConfig = {
  path: string;
  component: (params: Record<string, string>) => ComponentChildren;
};

function matchRoute(pathname: string, routes: RouteConfig[]): { component: (params: Record<string, string>) => ComponentChildren; params: Record<string, string> } | null {
  for (const route of routes) {
    const paramNames: string[] = [];
    const pattern = route.path.replace(/:(\w+)/g, (_, name: string) => {
      paramNames.push(name);
      return "([^/]+)";
    });
    const regex = new RegExp(`^${pattern}$`);
    const match = pathname.match(regex);
    if (match) {
      const params: Record<string, string> = {};
      paramNames.forEach((name, i) => {
        params[name] = match[i + 1] ?? "";
      });
      return { component: route.component, params };
    }
  }
  return null;
}

export function useRouter(routes: RouteConfig[], fallback: ComponentChildren) {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const matched = matchRoute(path, routes);
  if (matched) {
    return matched.component(matched.params);
  }
  return fallback;
}
