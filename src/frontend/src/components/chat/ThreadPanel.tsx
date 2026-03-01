import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Check, CheckCheck, MessageSquare, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useChat } from "../../contexts/ChatContext";
import type { AppUser, Message } from "../../types";
import { UserAvatar } from "./UserAvatar";

interface ThreadPanelProps {
  parentMessage: Message;
  groupId: string;
  users: Record<string, AppUser>;
  allMessages: Message[];
  onClose: () => void;
}

export function ThreadPanel({
  parentMessage,
  groupId,
  users,
  allMessages,
  onClose,
}: ThreadPanelProps) {
  const { currentUser } = useAuth();
  const { sendGroupMessage } = useChat();
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const threadMessages = allMessages.filter(
    (m) => m.replyTo === parentMessage.id && !m.deletedForEveryone,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: length-only dep is intentional for scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages.length]);

  const handleSend = useCallback(async () => {
    if (!currentUser || !replyText.trim()) return;
    setIsSending(true);
    try {
      await sendGroupMessage(
        groupId,
        currentUser.uid,
        replyText.trim(),
        "text",
        {
          replyTo: parentMessage.id,
        },
      );
      setReplyText("");
    } catch {
      // ignore
    } finally {
      setIsSending(false);
    }
  }, [currentUser, replyText, sendGroupMessage, groupId, parentMessage.id]);

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const sender = users[parentMessage.senderId];

  return (
    <div className="flex flex-col h-full border-l border-border bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MessageSquare size={16} className="text-primary flex-shrink-0" />
          <span className="font-semibold text-sm">Thread</span>
          <span className="text-xs text-muted-foreground">
            {threadMessages.length} repl
            {threadMessages.length === 1 ? "y" : "ies"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-xl flex-shrink-0"
          onClick={onClose}
        >
          <X size={16} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {/* Parent message */}
          <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
            <div className="flex items-center gap-2 mb-1.5">
              <UserAvatar
                src={sender?.profilePicture}
                username={sender?.username ?? "?"}
                size="xs"
                showOnline={false}
              />
              <span className="text-xs font-semibold">
                {sender?.username ?? "Unknown"}
              </span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {formatTime(parentMessage.createdAt)}
              </span>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {parentMessage.text || `📎 ${parentMessage.messageType}`}
            </p>
          </div>

          {/* Divider */}
          {threadMessages.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] text-muted-foreground font-medium">
                {threadMessages.length}{" "}
                {threadMessages.length === 1 ? "reply" : "replies"}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}

          {/* Thread replies */}
          {threadMessages.map((msg) => {
            const msgSender = users[msg.senderId];
            const isMine = msg.senderId === currentUser?.uid;
            const isSeen =
              !isMine || msg.seenBy.some((uid) => uid !== currentUser?.uid);

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex items-start gap-2.5",
                  isMine ? "flex-row-reverse" : "flex-row",
                )}
              >
                <UserAvatar
                  src={msgSender?.profilePicture}
                  username={msgSender?.username ?? "?"}
                  size="xs"
                  showOnline={false}
                />
                <div
                  className={cn(
                    "max-w-[75%] space-y-0.5",
                    isMine ? "items-end" : "items-start",
                    "flex flex-col",
                  )}
                >
                  {!isMine && (
                    <span className="text-[10px] font-semibold text-muted-foreground pl-1">
                      {msgSender?.username}
                    </span>
                  )}
                  <div
                    className={cn(
                      "rounded-[14px] px-3 py-2 text-sm",
                      isMine
                        ? "bg-gradient-to-br from-primary to-secondary text-white"
                        : "bg-muted text-foreground",
                    )}
                  >
                    {msg.text}
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1 text-[10px] text-muted-foreground",
                      isMine ? "justify-end" : "justify-start",
                    )}
                  >
                    <span>{formatTime(msg.createdAt)}</span>
                    {isMine &&
                      (isSeen ? (
                        <CheckCheck size={11} className="text-primary" />
                      ) : (
                        <Check size={11} />
                      ))}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Reply input */}
      <div className="p-3 border-t border-border bg-background flex-shrink-0">
        <div className="flex items-center gap-2">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Reply in thread..."
            className="flex-1 rounded-xl text-sm bg-muted/50 border-border/50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            size="icon"
            className="w-9 h-9 rounded-xl gradient-btn flex-shrink-0"
            onClick={handleSend}
            disabled={!replyText.trim() || isSending}
          >
            <Send size={14} className="text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
}
