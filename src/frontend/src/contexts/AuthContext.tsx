import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  clearSession,
  getSession,
  getUser,
  initStore,
  saveSession,
  saveUser,
} from "../services/chatService";
import type { AppUser } from "../types";

interface AuthContextType {
  currentUser: AppUser | null;
  isLoading: boolean;
  needsUsernameSetup: boolean;
  setupUsername: (username: string, bio: string) => Promise<{ error?: string }>;
  logout: () => void;
  deleteAccount: () => Promise<{ error?: string }>;
  updateProfile: (updates: Partial<AppUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { identity, clear, isInitializing, loginStatus } =
    useInternetIdentity();
  const { actor, isFetching } = useActor();

  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsUsernameSetup, setNeedsUsernameSetup] = useState(false);

  // Initialize store once
  useEffect(() => {
    initStore();
  }, []);

  // React to identity/actor changes
  useEffect(() => {
    if (isInitializing || loginStatus === "initializing") return;
    if (isFetching) return;

    const principal = identity?.getPrincipal();

    if (!principal || principal.isAnonymous()) {
      setCurrentUser(null);
      setNeedsUsernameSetup(false);
      setIsLoading(false);
      return;
    }

    const uid = principal.toString();

    // Try to load from localStorage first (fast path)
    const cached = getUser(uid);
    if (cached) {
      setCurrentUser(cached);
      setNeedsUsernameSetup(false);
      setIsLoading(false);
      // Still refresh from ICP in background
      if (actor) {
        actor
          .getUserProfile(principal)
          .then((profile) => {
            if (profile) {
              const user: AppUser = {
                uid,
                username: profile.username,
                email: profile.email || "",
                profilePicture:
                  profile.profilePicture ||
                  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(profile.username)}&backgroundColor=8b5cf6&textColor=ffffff`,
                bio: profile.bio,
                isPrivate: profile.isPrivate,
                onlineStatus: true,
                lastSeen: Date.now(),
                blockedUsers: profile.blockedUsers.map((p) => p.toString()),
                followers: profile.followers.map((p) => p.toString()),
                following: profile.following.map((p) => p.toString()),
                createdAt:
                  typeof profile.createdAt === "bigint"
                    ? Number(profile.createdAt / BigInt(1_000_000))
                    : Date.now(),
                fullName: profile.fullName || "",
                phoneNumber: profile.phoneNumber || "",
                birthDate: profile.birthDate || "",
                timezone: profile.timezone || "",
                websiteUrl: profile.websiteUrl || "",
              };
              saveUser(user);
              setCurrentUser(user);
            }
          })
          .catch(() => {});
      }
      return;
    }

    // No local cache — fetch from ICP backend
    if (!actor) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    actor
      .getUserProfile(principal)
      .then((profile) => {
        if (!profile) {
          // No profile found — needs username setup
          const session = getSession();
          if (session && session.uid === uid) {
            const localUser = getUser(uid);
            if (localUser) {
              setCurrentUser(localUser);
              setNeedsUsernameSetup(false);
              setIsLoading(false);
              return;
            }
          }
          setNeedsUsernameSetup(true);
          setCurrentUser(null);
          return;
        }

        const user: AppUser = {
          uid,
          username: profile.username,
          email: profile.email || "",
          profilePicture:
            profile.profilePicture ||
            `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(profile.username)}&backgroundColor=8b5cf6&textColor=ffffff`,
          bio: profile.bio,
          isPrivate: profile.isPrivate,
          onlineStatus: true,
          lastSeen: Date.now(),
          blockedUsers: profile.blockedUsers.map((p) => p.toString()),
          followers: profile.followers.map((p) => p.toString()),
          following: profile.following.map((p) => p.toString()),
          createdAt:
            typeof profile.createdAt === "bigint"
              ? Number(profile.createdAt / BigInt(1_000_000))
              : Date.now(),
          fullName: profile.fullName || "",
          phoneNumber: profile.phoneNumber || "",
          birthDate: profile.birthDate || "",
          timezone: profile.timezone || "",
          websiteUrl: profile.websiteUrl || "",
        };
        saveUser(user);
        saveSession({ uid, username: user.username });
        setCurrentUser(user);
        setNeedsUsernameSetup(false);

        // Update online status on backend (fire-and-forget)
        actor.updateOnlineStatus(true).catch(() => {});
      })
      .catch(() => {
        // Network error — check for existing session
        const session = getSession();
        if (session && session.uid === uid) {
          const localUser = getUser(uid);
          if (localUser) {
            setCurrentUser(localUser);
            setNeedsUsernameSetup(false);
            setIsLoading(false);
            return;
          }
        }
        setNeedsUsernameSetup(true);
        setCurrentUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [identity, actor, isFetching, isInitializing, loginStatus]);

  const setupUsername = useCallback(
    async (username: string, bio: string): Promise<{ error?: string }> => {
      const principal = identity?.getPrincipal();
      if (!principal || principal.isAnonymous()) {
        return { error: "Not authenticated" };
      }
      if (!actor) {
        return { error: "Backend not available" };
      }

      const uid = principal.toString();
      const trimmedUsername = username.trim();

      if (
        !trimmedUsername ||
        trimmedUsername.length < 3 ||
        trimmedUsername.length > 20
      ) {
        return { error: "Username must be 3–20 characters" };
      }
      if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
        return {
          error: "Username can only contain letters, numbers, and underscores",
        };
      }

      try {
        const now = BigInt(Date.now()) * BigInt(1_000_000);
        await actor.createOrUpdateUserProfile({
          _id: principal,
          username: trimmedUsername,
          bio: bio.trim(),
          email: "",
          profilePicture: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(trimmedUsername)}&backgroundColor=8b5cf6&textColor=ffffff`,
          isPrivate: false,
          onlineStatus: true,
          lastSeen: now,
          createdAt: now,
          blockedUsers: [],
          followers: [],
          following: [],
          closeFriends: [],
          fcmToken: "",
          fullName: "",
          phoneNumber: "",
          birthDate: "",
          timezone: "",
          websiteUrl: "",
        });

        const user: AppUser = {
          uid,
          username: trimmedUsername,
          email: "",
          profilePicture: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(trimmedUsername)}&backgroundColor=8b5cf6&textColor=ffffff`,
          bio: bio.trim(),
          isPrivate: false,
          onlineStatus: true,
          lastSeen: Date.now(),
          blockedUsers: [],
          followers: [],
          following: [],
          createdAt: Date.now(),
        };

        saveUser(user);
        saveSession({ uid, username: trimmedUsername });
        setCurrentUser(user);
        setNeedsUsernameSetup(false);
        return {};
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to save";
        return { error: msg };
      }
    },
    [identity, actor],
  );

  // ─── Online status heartbeat + visibility + beforeunload ─────────────────

  useEffect(() => {
    if (!actor || !currentUser) return;

    // Mark online immediately
    actor.updateOnlineStatus(true).catch(() => {});

    // Heartbeat every 60s while the tab is in the foreground
    const heartbeat = setInterval(() => {
      if (!document.hidden) {
        actor.updateOnlineStatus(true).catch(() => {});
      }
    }, 60_000);

    // Visibility change: tab hidden → offline, visible → online
    const handleVisibility = () => {
      if (document.hidden) {
        actor.updateOnlineStatus(false).catch(() => {});
      } else {
        actor.updateOnlineStatus(true).catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Tab close / navigate away → offline (fire-and-forget)
    const handleUnload = () => {
      actor.updateOnlineStatus(false).catch(() => {});
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [actor, currentUser]);

  const logout = useCallback(() => {
    if (currentUser) {
      saveUser({ ...currentUser, onlineStatus: false, lastSeen: Date.now() });
      actor?.updateOnlineStatus(false).catch(() => {});
    }
    clearSession();
    setCurrentUser(null);
    setNeedsUsernameSetup(false);
    clear();
  }, [currentUser, actor, clear]);

  const deleteAccount = useCallback(async (): Promise<{ error?: string }> => {
    if (!actor) return { error: "Backend not available" };
    try {
      await actor.deleteAccount();
      clearSession();
      setCurrentUser(null);
      setNeedsUsernameSetup(false);
      clear();
      return {};
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Failed to delete account",
      };
    }
  }, [actor, clear]);

  const updateProfile = useCallback(
    async (updates: Partial<AppUser>): Promise<void> => {
      if (!currentUser) return;
      const updated = { ...currentUser, ...updates };
      saveUser(updated);
      setCurrentUser(updated);

      if (
        actor &&
        identity?.getPrincipal() &&
        !identity.getPrincipal().isAnonymous()
      ) {
        const principal = identity.getPrincipal();
        const now = BigInt(Date.now()) * BigInt(1_000_000);
        actor
          .createOrUpdateUserProfile({
            _id: principal,
            username: updated.username,
            bio: updated.bio,
            email: updated.email || "",
            profilePicture: updated.profilePicture,
            isPrivate: updated.isPrivate,
            onlineStatus: updated.onlineStatus,
            lastSeen: now,
            createdAt: BigInt(updated.createdAt) * BigInt(1_000_000),
            blockedUsers: [],
            followers: [],
            following: [],
            closeFriends: [],
            fcmToken: "",
            fullName: updated.fullName || "",
            phoneNumber: updated.phoneNumber || "",
            birthDate: updated.birthDate || "",
            timezone: updated.timezone || "",
            websiteUrl: updated.websiteUrl || "",
          })
          .catch(() => {});
      }
    },
    [currentUser, actor, identity],
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        needsUsernameSetup,
        setupUsername,
        logout,
        deleteAccount,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
