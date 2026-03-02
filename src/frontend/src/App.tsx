import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ChatProvider } from "./contexts/ChatContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ArchivePage } from "./pages/ArchivePage";
import { BookmarksPage } from "./pages/BookmarksPage";
import { ChannelsPage } from "./pages/ChannelsPage";
import { ExplorePage } from "./pages/ExplorePage";
import { FeedPage } from "./pages/FeedPage";
import { HomePage } from "./pages/HomePage";
import { JoinGroupPage } from "./pages/JoinGroupPage";
import { LoginPage } from "./pages/LoginPage";
import { MessageRequestsPage } from "./pages/MessageRequestsPage";
import { NotesPage } from "./pages/NotesPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PublicRoomsPage } from "./pages/PublicRoomsPage";
import { SavedMessagesPage } from "./pages/SavedMessagesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { UsernameSetupPage } from "./pages/UsernameSetupPage";
import {
  applyAccentColor,
  applyBubbleStyle,
  applyFontSize,
  checkBirthdayNotifications,
} from "./services/featureService";

// ─── Root layout with providers ──────────────────────────────────────────────
function RootLayout() {
  // Apply persisted preferences on mount
  useEffect(() => {
    applyAccentColor();
    applyFontSize();
    applyBubbleStyle();
  }, []);

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

  // Birthday notifications after login — run only when uid changes (new login)
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional uid-only dep
  useEffect(() => {
    if (!currentUser) return;
    const followedUsers = (currentUser.following ?? []).map((id) => ({
      uid: id,
      username: id,
      birthDate: undefined as string | undefined,
    }));
    const birthdays = checkBirthdayNotifications(
      currentUser.uid,
      followedUsers,
    );
    for (const username of birthdays) {
      toast(`🎂 It's @${username}'s birthday today!`, { duration: 8000 });
    }
  }, [currentUser?.uid]);

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

const feedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/feed",
  beforeLoad: requireAuth,
  component: FeedPage,
});

const exploreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/explore",
  beforeLoad: requireAuth,
  component: ExplorePage,
});

const notesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notes",
  beforeLoad: requireAuth,
  component: NotesPage,
});

const bookmarksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/bookmarks",
  beforeLoad: requireAuth,
  component: BookmarksPage,
});

const joinGroupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/join/$groupId",
  beforeLoad: requireAuth,
  component: JoinGroupPage,
});

const roomsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rooms",
  beforeLoad: requireAuth,
  component: PublicRoomsPage,
});

const savedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/saved",
  beforeLoad: requireAuth,
  component: SavedMessagesPage,
});

const channelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/channels",
  beforeLoad: requireAuth,
  component: ChannelsPage,
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
  feedRoute,
  exploreRoute,
  notesRoute,
  bookmarksRoute,
  joinGroupRoute,
  roomsRoute,
  savedRoute,
  channelsRoute,
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
