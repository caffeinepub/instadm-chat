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
  LogOut,
  MessageCircle,
  MessageSquareDashed,
  Settings,
  User,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { ChatWindow } from "../components/chat/ChatWindow";
import { Sidebar } from "../components/chat/Sidebar";
import { UserAvatar } from "../components/chat/UserAvatar";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  action: () => void;
  isActive?: boolean;
  badge?: number;
}

export function HomePage() {
  const { activeChatId, setActiveChatId, unreadCount } = useChat();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const handleChatSelect = (chatId: string) => {
    setActiveChatId(chatId);
    setMobileChatOpen(true);
  };

  const handleBack = () => {
    setMobileChatOpen(false);
  };

  const navItems: NavItem[] = [
    {
      icon: <MessageCircle size={22} />,
      label: "Messages",
      action: () => {},
      isActive: true,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      icon: <Bell size={22} />,
      label: "Notifications",
      action: () => navigate({ to: "/notifications" }),
    },
    {
      icon: <Archive size={22} />,
      label: "Archive",
      action: () => navigate({ to: "/archive" }),
    },
    {
      icon: <Settings size={22} />,
      label: "Settings",
      action: () => navigate({ to: "/settings" }),
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
        <div className="hidden md:flex flex-col items-center gap-1 w-[60px] h-full bg-sidebar border-r border-sidebar-border py-4 flex-shrink-0">
          {/* App icon */}
          <div className="mb-4 flex items-center justify-center w-9 h-9 rounded-xl bg-primary">
            <MessageCircle size={18} className="text-white" strokeWidth={2.5} />
          </div>

          <div className="flex-1 flex flex-col items-center gap-1 w-full px-2">
            {navItems.map((item) => (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={item.action}
                    className={cn(
                      "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150",
                      item.isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent",
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
                  {item.label}
                </TooltipContent>
              </Tooltip>
            ))}
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
                  className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-border hover:ring-primary transition-all"
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
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
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
            "w-full md:w-[300px] lg:w-[320px] flex-shrink-0 h-full flex flex-col",
            mobileChatOpen ? "hidden md:flex" : "flex",
          )}
        >
          <Sidebar onChatSelect={handleChatSelect} />

          {/* Mobile bottom nav */}
          <div className="md:hidden flex items-center justify-around border-t border-border bg-background px-2 py-2 safe-bottom">
            {navItems.slice(0, 4).map((item) => (
              <button
                type="button"
                key={item.label}
                onClick={item.action}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors",
                  item.isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="absolute top-1 right-1 min-w-[14px] h-3.5 bg-destructive text-destructive-foreground rounded-full text-[9px] font-bold flex items-center justify-center px-1">
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
          {activeChatId ? (
            <ChatWindow chatId={activeChatId} onBack={handleBack} />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-8 bg-background">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-primary/8 flex items-center justify-center">
          <MessageSquareDashed
            size={40}
            className="text-primary/60"
            strokeWidth={1.5}
          />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-online-dot flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-white" />
        </div>
      </div>
      <div className="max-w-xs">
        <h2 className="text-xl font-bold tracking-tight">Your messages</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Search for a friend by their username to start a conversation. Your
          chats will appear here.
        </p>
      </div>
    </div>
  );
}
