import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bookmark, FileText, Mic, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import {
  type SavedMessage,
  getSavedMessages,
  unsaveMessage,
} from "../services/featureService";

export function SavedMessagesPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [savedMessages, setSavedMessages] = useState<SavedMessage[]>([]);

  useEffect(() => {
    document.body.classList.add("page-subpage");
    document.getElementById("root")?.classList.add("page-subpage");
    return () => {
      document.body.classList.remove("page-subpage");
      document.getElementById("root")?.classList.remove("page-subpage");
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setSavedMessages(getSavedMessages(currentUser.uid));
  }, [currentUser]);

  const handleUnsave = (sourceMessageId: string) => {
    if (!currentUser) return;
    unsaveMessage(currentUser.uid, sourceMessageId);
    setSavedMessages(getSavedMessages(currentUser.uid));
    toast.success("Removed from saved");
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderPreview = (msg: SavedMessage) => {
    if (msg.messageType === "image") {
      return (
        <div className="mt-2 rounded-xl overflow-hidden max-h-36">
          <img
            src={msg.mediaUrl}
            alt="Saved media"
            className="w-full object-cover max-h-36"
            loading="lazy"
          />
        </div>
      );
    }
    if (msg.messageType === "voice") {
      return (
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <Mic size={13} />
          <span>Voice message</span>
        </div>
      );
    }
    if (msg.messageType === "file") {
      return (
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <FileText size={13} />
          <span>File attachment</span>
        </div>
      );
    }
    return null;
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
          className="font-bold text-lg tracking-tight flex items-center gap-2"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          <Bookmark size={18} className="text-primary" />
          Saved Messages
        </h1>
        <span className="ml-auto text-xs text-muted-foreground">
          {savedMessages.length} saved
        </span>
      </div>

      <div className="max-w-lg mx-auto py-4">
        {savedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: "oklch(var(--primary) / 0.08)",
                border: "1px solid oklch(var(--primary) / 0.12)",
              }}
            >
              <Bookmark
                size={26}
                className="text-primary/60"
                strokeWidth={1.5}
              />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">No saved messages</p>
              <p className="text-muted-foreground text-xs mt-1">
                Long-press any message and choose "Save" to save it here
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 px-4">
            {savedMessages.map((msg, i) => (
              <div key={msg.id}>
                <div className="flex items-start gap-3 py-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "oklch(var(--primary) / 0.1)" }}
                  >
                    <Bookmark size={14} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {msg.senderUsername && (
                      <p className="text-xs text-primary font-semibold mb-0.5">
                        @{msg.senderUsername}
                      </p>
                    )}
                    {msg.text && (
                      <p className="text-sm leading-relaxed text-foreground">
                        {msg.text}
                      </p>
                    )}
                    {renderPreview(msg)}
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {formatTime(msg.savedAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 rounded-xl text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={() => handleUnsave(msg.sourceMessageId)}
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                {i < savedMessages.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
