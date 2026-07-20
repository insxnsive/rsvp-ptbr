import AdminDashboard from "./components/AdminDashboard.js";
import CheckinDashboard from "./components/CheckinDashboard.js";
import ErrorBoundary from "./components/ErrorBoundary.js";
import NotFound from "./components/NotFound.js";
import ProtectedPage from "./components/ProtectedPage.js";
import PublicRsvpPage from "./components/PublicRsvpPage.js";
import { useRouter } from "./router.js";

function AdminPage() {
  return <ProtectedPage>{({ logout }) => <AdminDashboard logout={logout} />}</ProtectedPage>;
}

function CheckinPage() {
  return <ProtectedPage>{({ logout }) => <CheckinDashboard logout={logout} />}</ProtectedPage>;
}

export default function App() {
  return (
    <ErrorBoundary>
      {useRouter(
        [
          { path: "/rsvp", component: () => <AdminPage /> },
          { path: "/rsvp-confirm", component: () => <CheckinPage /> },
          { path: "/:slug", component: (params) => <PublicRsvpPage slug={params.slug ?? ""} /> }
        ],
        <NotFound />
      )}
    </ErrorBoundary>
  );
}
