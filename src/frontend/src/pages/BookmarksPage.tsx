import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bookmark, ExternalLink, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import {
  type Bookmark as BookmarkItem,
  getBookmarks,
  removeBookmark,
} from "../services/featureService";

export function BookmarksPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const uid = currentUser!.uid;

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() =>
    getBookmarks(uid),
  );

  useEffect(() => {
    document.body.classList.add("page-subpage");
    document.getElementById("root")?.classList.add("page-subpage");
    return () => {
      document.body.classList.remove("page-subpage");
      document.getElementById("root")?.classList.remove("page-subpage");
    };
  }, []);

  const handleRemove = (messageId: string) => {
    removeBookmark(uid, messageId);
    setBookmarks(getBookmarks(uid));
    toast.success("Bookmark removed");
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-dvh bg-background page-fade overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl w-9 h-9"
          onClick={() => navigate({ to: "/" })}
        >
          <ArrowLeft size={18} />
        </Button>
        <h1
          className="font-bold text-lg flex-1 tracking-tight"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Bookmarks
        </h1>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          {bookmarks.length} saved
        </span>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Bookmark
                size={28}
                className="text-muted-foreground"
                strokeWidth={1.5}
              />
            </div>
            <div>
              <p className="font-semibold text-sm">No bookmarks yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Long-press any message and select "Bookmark" to save it here
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-3">
              {bookmarks.map((bm) => (
                <div
                  key={bm.messageId}
                  className="rounded-2xl border border-border bg-card p-4 space-y-2 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-primary mb-1">
                        @{bm.senderUsername}
                      </p>
                      <p className="text-sm leading-relaxed line-clamp-3">
                        {bm.text || (
                          <span className="italic text-muted-foreground">
                            Media message
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemove(bm.messageId)}
                        title="Remove bookmark"
                      >
                        <Trash2 size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 rounded-lg text-muted-foreground hover:text-primary"
                        onClick={() => navigate({ to: "/" })}
                        title="Go to chat"
                      >
                        <ExternalLink size={13} />
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Saved {formatDate(bm.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            Built with love using caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
