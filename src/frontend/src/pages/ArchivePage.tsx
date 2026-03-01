import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Archive, ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { UserAvatar } from "../components/chat/UserAvatar";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";

export function ArchivePage() {
  const navigate = useNavigate();
  const { chats, users, messages, setActiveChatId, toggleArchive } = useChat();
  const { currentUser } = useAuth();

  const currentUid = currentUser!.uid;

  // Enable scrolling on sub-page
  useEffect(() => {
    document.body.classList.add("page-subpage");
    document.getElementById("root")?.classList.add("page-subpage");
    return () => {
      document.body.classList.remove("page-subpage");
      document.getElementById("root")?.classList.remove("page-subpage");
    };
  }, []);
  const archivedChats = chats.filter((c) => c.archived[currentUid]);

  const handleOpen = (chatId: string) => {
    setActiveChatId(chatId);
    navigate({ to: "/" });
  };

  const handleUnarchive = (chatId: string) => {
    toggleArchive(chatId, currentUid);
  };

  return (
    <div className="min-h-dvh bg-background page-fade overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl w-9 h-9"
          onClick={() => navigate({ to: "/" })}
        >
          <ArrowLeft size={18} />
        </Button>
        <h1
          className="font-bold text-lg tracking-tight"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Archived chats
        </h1>
      </div>

      <div className="max-w-lg mx-auto py-2 px-0 sm:px-4">
        {archivedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: "oklch(var(--primary) / 0.08)",
                border: "1px solid oklch(var(--primary) / 0.12)",
              }}
            >
              <Archive
                size={26}
                className="text-primary/60"
                strokeWidth={1.5}
              />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Nothing archived</p>
              <p className="text-muted-foreground text-xs mt-1">
                Archived chats will appear here
              </p>
            </div>
          </div>
        ) : (
          archivedChats.map((chat) => {
            const otherUid =
              chat.participants.find((p) => p !== currentUid) ?? "";
            const other = users[otherUid];
            const chatMessages = messages[chat.id] ?? [];
            const lastMsg = chatMessages.at(-1);
            if (!other) return null;

            return (
              <div
                key={chat.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/70 transition-colors border-b border-border/30 last:border-0"
              >
                <button
                  type="button"
                  className="flex items-center gap-3 flex-1 text-left"
                  onClick={() => handleOpen(chat.id)}
                >
                  <UserAvatar
                    src={other.profilePicture}
                    username={other.username}
                    isOnline={other.onlineStatus}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{other.username}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {lastMsg?.text ?? chat.lastMessage ?? "No messages yet"}
                    </p>
                  </div>
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs flex-shrink-0"
                  onClick={() => handleUnarchive(chat.id)}
                >
                  Unarchive
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
