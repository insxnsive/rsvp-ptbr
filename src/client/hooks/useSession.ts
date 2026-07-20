import { useCallback, useEffect, useState } from "preact/hooks";
import { api } from "../api.js";
import type { SessionResponse } from "../types.js";

export function useSession() {
  const [session, setSession] = useState<SessionResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.session()
      .then((s) => { if (!cancelled) setSession(s); })
      .catch(() => { if (!cancelled) setSession({ authenticated: false }); });
    return () => { cancelled = true; };
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // clear local session regardless
    }
    setSession({ authenticated: false });
  }, []);

  return { session, setSession, logout };
}
