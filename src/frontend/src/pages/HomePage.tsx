import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import {
  Archive,
  Bell,
  Bookmark,
  Bookmark as BookmarkIcon,
  Compass,
  LogOut,
  MessageCircle,
  MessageSquareDashed,
  MoreHorizontal,
  StickyNote,
  User,
  Users2,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChatWindow } from "../components/chat/ChatWindow";
import { GroupChatWindow } from "../components/chat/GroupChatWindow";
import { Sidebar } from "../components/chat/Sidebar";
import { UserAvatar } from "../components/chat/UserAvatar";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";
import { useNotificationPermission } from "../hooks/useNotificationPermission";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  action: () => void;
  isActive?: boolean;
  badge?: number;
  tooltip?: string;
}

export function HomePage() {
  const {
    activeChatId,
    setActiveChatId,
    unreadCount,
    activeGroupChatId,
    setActiveGroupChatId,
    groupChats,
  } = useChat();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const { requestPermission, isSupported, markAsked } =
    useNotificationPermission();

  // Show notification permission prompt on first visit (if not yet asked)
  useEffect(() => {
    const notifSupported = typeof Notification !== "undefined" && isSupported;
    if (!notifSupported) return;
    const alreadyAskedNow =
      localStorage.getItem("notificationPermissionAsked") === "true";
    if (alreadyAskedNow) return;
    const currentPermission =
      typeof Notification !== "undefined" ? Notification.permission : "denied";
    if (currentPermission === "granted" || currentPermission === "denied")
      return;

    const timer = setTimeout(() => {
      markAsked();
      toast(
        <NotificationPromptToast
          onEnable={() => {
            requestPermission();
            toast.dismiss("notif-permission");
          }}
          onDismiss={() => toast.dismiss("notif-permission")}
        />,
        { duration: 12000, id: "notif-permission" },
      );
    }, 2000);

    return () => clearTimeout(timer);
  }, [isSupported, markAsked, requestPermission]);

  const handleChatSelect = (_chatId: string) => {
    // openChat (for search results) or handleSelectChat (for existing chats) already
    // calls setActiveChatId internally. This callback only handles mobile UI state.
    setActiveGroupChatId(null);
    setMobileChatOpen(true);
  };

  const handleGroupSelect = (groupId: string) => {
    // Always clear DM chat first so GroupChatWindow renders instead of ChatWindow
    setActiveChatId(null);
    setActiveGroupChatId(groupId);
    setMobileChatOpen(true);
  };

  const handleBack = () => {
    setMobileChatOpen(false);
  };

  // 5 core primary nav items for desktop + 5 for mobile bottom bar
  // Stories are accessed via the StoryBar "+" button in the sidebar — no separate nav needed
  const primaryNavItems: NavItem[] = [
    {
      icon: <MessageCircle size={22} />,
      label: "Messages",
      action: () => {},
      isActive: true,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      icon: <Compass size={22} />,
      label: "Discover",
      action: () => navigate({ to: "/explore" }),
      tooltip: "Discover — explore & feed",
    },
    {
      icon: <Users2 size={22} />,
      label: "Community",
      action: () => navigate({ to: "/channels" }),
      tooltip: "Community — groups & channels",
    },
    {
      icon: <Bell size={22} />,
      label: "Notifications",
      action: () => navigate({ to: "/notifications" }),
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
  ];

  // Bottom 5 mobile nav items (no duplicate badge)
  const mobileNavItems: NavItem[] = [
    {
      icon: <MessageCircle size={22} />,
      label: "Messages",
      action: () => {},
      isActive: true,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      icon: <Compass size={22} />,
      label: "Discover",
      action: () => navigate({ to: "/explore" }),
    },
    {
      icon: <Bell size={22} />,
      label: "Alerts",
      action: () => navigate({ to: "/notifications" }),
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      icon: <User size={22} />,
      label: "Profile",
      action: () => navigate({ to: `/profile/${currentUser?.username}` }),
    },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-dvh bg-background overflow-hidden">
        {/* ── Icon nav (desktop) ── */}
        <div className="hidden md:flex flex-col items-center gap-1 w-[64px] h-full bg-sidebar border-r border-sidebar-border py-4 flex-shrink-0 nav-rail">
          {/* App icon */}
          <div
            className="mb-5 flex items-center justify-center w-10 h-10 rounded-2xl bg-primary shadow-sm"
            style={{ boxShadow: "0 2px 12px oklch(var(--primary) / 0.3)" }}
          >
            <MessageCircle size={20} className="text-white" strokeWidth={2.5} />
          </div>

          <div className="flex-1 flex flex-col items-center gap-1.5 w-full px-2">
            {primaryNavItems.map((item) => (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={item.action}
                    data-ocid={`nav.${item.label.toLowerCase()}.button`}
                    className={cn(
                      "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150",
                      item.isActive
                        ? "nav-icon-active"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                    )}
                  >
                    {item.icon}
                    {item.badge && item.badge > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-destructive text-destructive-foreground rounded-full text-[9px] font-bold flex items-center justify-center px-1">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {item.tooltip ?? item.label}
                </TooltipContent>
              </Tooltip>
            ))}

            {/* Profile (6th primary item) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() =>
                    navigate({ to: `/profile/${currentUser?.username}` })
                  }
                  data-ocid="nav.profile.button"
                  className="relative w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-all duration-150"
                >
                  <User size={22} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                Profile
              </TooltipContent>
            </Tooltip>

            {/* Overflow / More — collapses secondary nav items */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-ocid="nav.more.button"
                  className="relative w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-all duration-150"
                  title="More"
                >
                  <MoreHorizontal size={20} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                align="start"
                className="rounded-xl w-44"
              >
                <DropdownMenuItem onClick={() => navigate({ to: "/feed" })}>
                  <Compass size={14} className="mr-2" />
                  Feed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/archive" })}>
                  <Archive size={14} className="mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/saved" })}>
                  <BookmarkIcon size={14} className="mr-2" />
                  Saved Messages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/notes" })}>
                  <StickyNote size={14} className="mr-2" />
                  Notes
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate({ to: "/bookmarks" })}
                >
                  <Bookmark size={14} className="mr-2" />
                  Bookmarks
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/requests" })}>
                  <MessageCircle size={14} className="mr-2" />
                  Message Requests
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
                  <User size={14} className="mr-2" />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Avatar + logout at bottom */}
          <div className="flex flex-col items-center gap-2 px-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() =>
                    navigate({ to: `/profile/${currentUser?.username}` })
                  }
                  className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-border hover:ring-primary transition-all"
                >
                  <UserAvatar
                    src={currentUser?.profilePicture}
                    username={currentUser?.username ?? "Me"}
                    size="sm"
                    showOnline={false}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {currentUser?.username}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={logout}
                  data-ocid="nav.logout.button"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <LogOut size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                Sign out
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ── Sidebar (chat list) ── */}
        <div
          className={cn(
            "w-full md:w-[320px] lg:w-[340px] flex-shrink-0 h-full flex flex-col",
            mobileChatOpen ? "hidden md:flex" : "flex",
          )}
        >
          <Sidebar
            onChatSelect={handleChatSelect}
            onGroupSelect={handleGroupSelect}
          />

          {/* Mobile bottom nav — 5 items */}
          <div className="md:hidden flex items-center justify-around border-t border-border bg-background/95 backdrop-blur-sm px-1 py-1.5 safe-bottom">
            {mobileNavItems.map((item) => (
              <button
                type="button"
                key={item.label}
                onClick={item.action}
                data-ocid={`nav.${item.label.toLowerCase()}.button`}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors min-w-[48px]",
                  item.isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[14px] h-3.5 bg-destructive text-destructive-foreground rounded-full text-[9px] font-bold flex items-center justify-center px-1">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main chat area ── */}
        <div
          className={cn(
            "flex-1 h-full flex flex-col min-w-0",
            mobileChatOpen ? "flex" : "hidden md:flex",
          )}
        >
          {activeGroupChatId ? (
            (() => {
              const group = groupChats.find((g) => g.id === activeGroupChatId);
              return group ? (
                <GroupChatWindow group={group} onBack={handleBack} />
              ) : (
                <EmptyState />
              );
            })()
          ) : activeChatId ? (
            <ChatWindow chatId={activeChatId} onBack={handleBack} />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ─── Notification permission toast component ──────────────────────────────────
function NotificationPromptToast({
  onEnable,
  onDismiss,
}: {
  onEnable: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-semibold text-sm">🔔 Enable notifications</p>
      <p className="text-xs text-muted-foreground">
        Get notified when friends message you
      </p>
      <div className="flex gap-2 mt-1">
        <button
          type="button"
          onClick={onEnable}
          className="flex-1 text-xs bg-primary text-primary-foreground rounded-lg py-1.5 px-3 font-semibold hover:opacity-90 transition-opacity"
        >
          Enable
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="flex-1 text-xs bg-muted text-muted-foreground rounded-lg py-1.5 px-3 font-medium hover:opacity-80 transition-opacity"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-8 bg-background relative overflow-hidden">
      {/* Atmospheric background glows */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(0.64 0.27 278 / 0.06), transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-1/4 left-1/3 w-60 h-60 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(0.62 0.22 300 / 0.04), transparent 70%)",
        }}
      />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center"
          style={{
            background: "oklch(var(--primary) / 0.08)",
            border: "1px solid oklch(var(--primary) / 0.14)",
            boxShadow: "0 8px 32px oklch(var(--primary) / 0.08)",
          }}
        >
          <MessageSquareDashed
            size={40}
            className="text-primary/60"
            strokeWidth={1.5}
          />
        </div>
        <div className="max-w-xs">
          <h2
            className="text-xl font-bold tracking-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Your messages
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Search for a friend by their username to start a conversation.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-muted/50 border border-border/50">
            <div className="w-2 h-2 rounded-full bg-online-dot" />
            <span className="text-xs text-muted-foreground font-medium">
              Messages are end-to-end private
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
