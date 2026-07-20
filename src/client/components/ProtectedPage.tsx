import type { ComponentChildren } from "preact";
import { LoaderCircle } from "lucide-preact";
import { useSession } from "../hooks/useSession.js";
import LoginPanel from "./LoginPanel.js";

export default function ProtectedPage({
  children
}: {
  children: (props: { logout: () => Promise<void> }) => ComponentChildren;
}) {
  const { session, setSession, logout } = useSession();

  if (!session) {
    return (
      <main class="grid min-h-screen place-items-center">
        <LoaderCircle class="animate-spin text-teal-700" size={28} aria-hidden="true" />
      </main>
    );
  }

  if (!session.authenticated) {
    return <LoginPanel onAuthenticated={setSession} />;
  }

  return <>{children({ logout })}</>;
}
