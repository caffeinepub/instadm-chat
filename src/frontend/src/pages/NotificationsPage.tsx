import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bell } from "lucide-react";
import React, { useEffect } from "react";
import { UserAvatar } from "../components/chat/UserAvatar";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";

export function NotificationsPage() {
  const navigate = useNavigate();
  const {
    notifications,
    users,
    markNotificationRead,
    markAllNotificationsRead,
    setActiveChatId,
  } = useChat();
  const { currentUser } = useAuth();

  const myNotifs = notifications
    .filter((n) => n.receiverId === currentUser?.uid)
    .sort((a, b) => b.createdAt - a.createdAt);

  useEffect(() => {
    // Mark all read after viewing
    const timer = setTimeout(markAllNotificationsRead, 3000);
    return () => clearTimeout(timer);
  }, [markAllNotificationsRead]);

  const handleClick = (notifId: string, chatId?: string) => {
    markNotificationRead(notifId);
    if (chatId) {
      setActiveChatId(chatId);
      navigate({ to: "/" });
    }
  };

  return (
    <div className="min-h-dvh bg-background page-fade">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/" })}
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="font-bold text-lg flex-1">Notifications</h1>
        {myNotifs.some((n) => !n.read) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-primary"
            onClick={markAllNotificationsRead}
          >
            Mark all read
          </Button>
        )}
      </div>

      <div className="max-w-lg mx-auto py-2">
        {myNotifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Bell size={28} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">
              No notifications yet
            </p>
          </div>
        ) : (
          myNotifs.map((notif) => {
            const sender = users[notif.senderId];
            return (
              <button
                type="button"
                key={notif.id}
                onClick={() => handleClick(notif.id, notif.chatId)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left",
                  !notif.read && "bg-primary/5",
                )}
              >
                <div className="relative">
                  <UserAvatar
                    src={sender?.profilePicture}
                    username={sender?.username ?? "?"}
                    size="md"
                    showOnline={false}
                  />
                  {!notif.read && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm",
                      !notif.read ? "font-semibold" : "font-medium",
                    )}
                  >
                    {notif.text}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatNotifTime(notif.createdAt)}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function formatNotifTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours} hours ago`;
  return `${days} days ago`;
}
