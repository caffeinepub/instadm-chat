import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Archive, ArrowLeft } from "lucide-react";
import React from "react";
import { UserAvatar } from "../components/chat/UserAvatar";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";

export function ArchivePage() {
  const navigate = useNavigate();
  const { chats, users, messages, setActiveChatId, toggleArchive } = useChat();
  const { currentUser } = useAuth();

  const currentUid = currentUser!.uid;
  const archivedChats = chats.filter((c) => c.archived[currentUid]);

  const handleOpen = (chatId: string) => {
    setActiveChatId(chatId);
    navigate({ to: "/" });
  };

  const handleUnarchive = (chatId: string) => {
    toggleArchive(chatId, currentUid);
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
        <h1 className="font-bold text-lg">Archived chats</h1>
      </div>

      <div className="max-w-lg mx-auto py-2">
        {archivedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Archive size={28} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">No archived chats</p>
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
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors"
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
