import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ChatProvider } from "./contexts/ChatContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ArchivePage } from "./pages/ArchivePage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { MessageRequestsPage } from "./pages/MessageRequestsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SettingsPage } from "./pages/SettingsPage";
import { UsernameSetupPage } from "./pages/UsernameSetupPage";

// ─── Root layout with providers ──────────────────────────────────────────────
function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouterContent />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppRouterContent() {
  const { currentUser, isLoading, needsUsernameSetup } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading Linkr...</p>
        </div>
      </div>
    );
  }

  if (needsUsernameSetup) {
    return <UsernameSetupPage />;
  }

  if (!currentUser) {
    return <Outlet />;
  }

  return (
    <ChatProvider currentUid={currentUser.uid}>
      <Outlet />
    </ChatProvider>
  );
}

// ─── Route definitions ────────────────────────────────────────────────────────
const rootRoute = createRootRoute({ component: RootLayout });

// Guard helper — called in beforeLoad
function requireAuth() {
  const session = localStorage.getItem("linkr_session");
  if (!session) {
    throw redirect({ to: "/login" });
  }
}

function requireGuest() {
  const session = localStorage.getItem("linkr_session");
  if (session) {
    throw redirect({ to: "/" });
  }
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: requireGuest,
  component: LoginPage,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: requireAuth,
  component: HomePage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/$username",
  beforeLoad: requireAuth,
  component: ProfilePage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  beforeLoad: requireAuth,
  component: SettingsPage,
});

const requestsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/requests",
  beforeLoad: requireAuth,
  component: MessageRequestsPage,
});

const archiveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/archive",
  beforeLoad: requireAuth,
  component: ArchivePage,
});

const notificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notifications",
  beforeLoad: requireAuth,
  component: NotificationsPage,
});

// ─── Router ───────────────────────────────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  loginRoute,
  homeRoute,
  profileRoute,
  settingsRoute,
  requestsRoute,
  archiveRoute,
  notificationsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
