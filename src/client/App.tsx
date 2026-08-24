import { lazy, Suspense } from "preact/compat";
import ErrorBoundary from "./components/ErrorBoundary.js";
import NotFound from "./components/NotFound.js";
import ProtectedPage from "./components/ProtectedPage.js";
import { useRouter } from "./router.js";

const AdminDashboard = lazy(() => import("./components/AdminDashboard.js"));
const CheckinDashboard = lazy(() => import("./components/CheckinDashboard.js"));
const PublicRsvpPage = lazy(() => import("./components/PublicRsvpPage.js"));

function PageLoader() {
  return (
    <main class="grid min-h-[100dvh] place-items-center px-4" aria-busy="true">
      <div class="w-full max-w-sm space-y-3" role="status" aria-label="Carregando">
        <div class="skeleton-block h-5 w-24" />
        <div class="skeleton-block h-12 w-full" />
        <div class="skeleton-block h-28 w-full" />
      </div>
    </main>
  );
}

function AdminPage() {
  return <ProtectedPage>{({ logout }) => <AdminDashboard logout={logout} />}</ProtectedPage>;
}

function CheckinPage() {
  return <ProtectedPage>{({ logout }) => <CheckinDashboard logout={logout} />}</ProtectedPage>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {useRouter(
          [
            { path: "/rsvp", component: () => <AdminPage /> },
            { path: "/rsvp-confirm", component: () => <CheckinPage /> },
            { path: "/:slug", component: (params) => <PublicRsvpPage slug={params.slug ?? ""} /> }
          ],
          <NotFound />
        )}
      </Suspense>
    </ErrorBoundary>
  );
}
