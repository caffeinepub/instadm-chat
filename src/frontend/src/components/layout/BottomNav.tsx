import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Bell, MessageCircle, Search, User } from "lucide-react";
import type React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useChat } from "../../contexts/ChatContext";
import { UserAvatar } from "../chat/UserAvatar";

interface BottomNavProps {
  currentPath: string;
  onProfileClick?: () => void;
}

export function BottomNav({ currentPath, onProfileClick }: BottomNavProps) {
  const { currentUser } = useAuth();
  const { unreadCount } = useChat();

  return (
    <nav className="md:hidden flex items-center justify-around border-t border-border bg-background/95 backdrop-blur-sm py-2 flex-shrink-0">
      <NavItem
        icon={<MessageCircle size={24} />}
        to="/"
        isActive={currentPath === "/"}
        label="Chats"
      />
      <NavItem
        icon={<Search size={24} />}
        to="/"
        isActive={false}
        label="Search"
        onClick={() => {
          document.getElementById("sidebar-search")?.focus();
        }}
      />
      <NavItem
        icon={
          <div className="relative">
            <Bell size={24} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
        }
        to="/notifications"
        isActive={currentPath === "/notifications"}
        label="Notifications"
      />
      <button
        type="button"
        onClick={onProfileClick}
        className={cn(
          "flex flex-col items-center gap-0.5 p-2 rounded-xl transition-colors",
          currentPath.startsWith("/profile")
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <UserAvatar
          src={currentUser?.profilePicture}
          username={currentUser?.username ?? "?"}
          size="xs"
          showOnline={false}
        />
        <span className="text-[10px]">Profile</span>
      </button>
    </nav>
  );
}

function NavItem({
  icon,
  to,
  isActive,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  to: string;
  isActive: boolean;
  label: string;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex flex-col items-center gap-0.5 p-2 rounded-xl transition-colors",
          isActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {icon}
        <span className="text-[10px]">{label}</span>
      </button>
    );
  }

  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center gap-0.5 p-2 rounded-xl transition-colors",
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      <span className="text-[10px]">{label}</span>
    </Link>
  );
}
