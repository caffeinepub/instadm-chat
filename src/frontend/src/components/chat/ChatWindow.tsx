import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Archive,
  ArrowLeft,
  Image,
  Info,
  Mic,
  MoreHorizontal,
  PhoneOff,
  Pin,
  Search,
  Send,
  VolumeX,
  Zap,
} from "lucide-react";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { useChat } from "../../contexts/ChatContext";
import type { Message } from "../../types";
import { EmojiPicker } from "./EmojiPicker";
import { ForwardModal } from "./ForwardModal";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { UserAvatar } from "./UserAvatar";

interface ChatWindowProps {
  chatId: string;
  onBack?: () => void;
}

export function ChatWindow({ chatId, onBack }: ChatWindowProps) {
  const {
    chats,
    messages: allMessages,
    users,
    sendMessage,
    editMessage,
    deleteMessageForEveryone,
    deleteMessageForMe,
    reactToMessage,
    forwardMessage,
    markSeen,
    setTyping,
    togglePin,
    toggleArchive,
    toggleMute,
    toggleVanishMode,
  } = useChat();
  const { currentUser } = useAuth();

  const [inputText, setInputText] = useState("");
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(
    null,
  );
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chat = chats.find((c) => c.id === chatId);
  const currentUid = currentUser!.uid;
  const otherUid = chat?.participants.find((p) => p !== currentUid) ?? "";
  const otherUser = users[otherUid];
  const chatMessages = allMessages[chatId] ?? [];

  const isBlocked = currentUser?.blockedUsers?.includes(otherUid) || false;
  const isBlockedByOther =
    otherUser?.blockedUsers?.includes(currentUid) || false;

  // Mark as seen when window opens or new messages arrive
  // biome-ignore lint/correctness/useExhaustiveDependencies: length-only dep is intentional
  useEffect(() => {
    markSeen(chatId, currentUid);
  }, [chatId, currentUid, markSeen, chatMessages.length]);

  // Scroll to bottom on new message
  // biome-ignore lint/correctness/useExhaustiveDependencies: length-only dep is intentional
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  // Vanish mode: delete seen messages after 5s
  useEffect(() => {
    if (!chat?.vanishMode) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const msg of chatMessages) {
      if (msg.seenBy.length >= 2 && !msg.deletedForEveryone && !msg.vanish) {
        const t = setTimeout(() => {
          deleteMessageForEveryone(chatId, msg.id);
        }, 5000);
        timers.push(t);
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [chat?.vanishMode, chatMessages, chatId, deleteMessageForEveryone]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isSending) return;

    if (editingMessage) {
      try {
        await editMessage(chatId, editingMessage.id, text);
        setEditingMessage(null);
      } catch {
        toast.error("Failed to edit message");
      }
    } else {
      setIsSending(true);
      try {
        await sendMessage(chatId, currentUid, text, "text", {
          replyTo: replyToMessage?.id,
        });
        setReplyToMessage(null);
      } catch {
        toast.error("Failed to send message");
      } finally {
        setIsSending(false);
      }
    }
    setInputText("");
    // Stop typing indicator
    setTyping(chatId, currentUid, false);
    inputRef.current?.focus();
  }, [
    inputText,
    isSending,
    editingMessage,
    replyToMessage,
    chatId,
    currentUid,
    editMessage,
    sendMessage,
    setTyping,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputText(e.target.value);
      setTyping(chatId, currentUid, e.target.value.length > 0);
    },
    [chatId, currentUid, setTyping],
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const isImage = file.type.startsWith("image/");
      try {
        await sendMessage(chatId, currentUid, "", isImage ? "image" : "file", {
          mediaUrl: isImage ? url : undefined,
          mediaName: file.name,
        });
      } catch {
        toast.error("Failed to send file");
      }
      e.target.value = "";
    },
    [chatId, currentUid, sendMessage],
  );

  // Typing indicator: is the OTHER user typing?
  const isOtherTyping = Object.entries(chat?.typing ?? {}).some(
    ([uid, val]) => uid !== currentUid && val,
  );

  const isPinned = chat?.pinned[currentUid] ?? false;
  const isArchived = chat?.archived[currentUid] ?? false;
  const isMuted = chat?.muted[currentUid] ?? false;

  const visibleMessages = chatMessages.filter(
    (m) => !m.deletedFor.includes(currentUid),
  );

  const filteredMessages = searchQuery
    ? visibleMessages.filter((m) =>
        m.text.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : visibleMessages;

  const allChats = chats;

  // Find the last sent message index
  const lastSentIdx = (() => {
    for (let i = filteredMessages.length - 1; i >= 0; i--) {
      if (filteredMessages[i].senderId === currentUid) return i;
    }
    return -1;
  })();

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <PhoneOff size={28} className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!otherUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <PhoneOff size={28} className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">Loading user info...</p>
        </div>
      </div>
    );
  }

  const participants = chat.participants
    .map((uid) => users[uid])
    .filter(Boolean);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="-ml-2 md:hidden"
          >
            <ArrowLeft size={20} />
          </Button>
        )}

        <button
          type="button"
          className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
          onClick={() => {}}
        >
          <UserAvatar
            src={otherUser.profilePicture}
            username={otherUser.username}
            isOnline={otherUser.onlineStatus}
            size="md"
          />
          <div className="flex-1 min-w-0 text-left">
            <p className="font-semibold text-sm truncate">
              @{otherUser.username}
            </p>
            <p className="text-xs text-muted-foreground">
              {isOtherTyping ? (
                <span className="text-primary animate-pulse">typing...</span>
              ) : otherUser.onlineStatus ? (
                "Active now"
              ) : (
                `Last seen ${formatLastSeen(otherUser.lastSeen)}`
              )}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen((v) => !v)}
            className={cn(searchOpen && "bg-accent")}
          >
            <Search size={18} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={() => togglePin(chatId, currentUid)}>
                <Pin size={14} className="mr-2" />
                {isPinned ? "Unpin chat" : "Pin chat"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toggleArchive(chatId, currentUid)}
              >
                <Archive size={14} className="mr-2" />
                {isArchived ? "Unarchive" : "Archive chat"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleMute(chatId, currentUid)}>
                <VolumeX size={14} className="mr-2" />
                {isMuted ? "Unmute" : "Mute notifications"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleVanishMode(chatId)}>
                <Zap size={14} className="mr-2" />
                {chat.vanishMode
                  ? "Turn off vanish mode"
                  : "Turn on vanish mode"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon">
            <Info size={18} />
          </Button>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="px-4 py-2 border-b border-border bg-muted/30">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in conversation..."
            className="rounded-xl h-8 text-sm"
            autoFocus
          />
        </div>
      )}

      {/* Vanish mode indicator */}
      {chat.vanishMode && (
        <div className="flex items-center justify-center gap-2 py-2 bg-primary/5 border-b border-border">
          <Zap size={12} className="text-primary" />
          <span className="text-xs text-primary font-medium">
            Vanish mode is on
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-scroll py-2">
        {filteredMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
            <UserAvatar
              src={otherUser.profilePicture}
              username={otherUser.username}
              size="xl"
              showOnline={false}
            />
            <div className="text-center">
              <p className="font-semibold">@{otherUser.username}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {otherUser.bio || "No bio yet"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {searchQuery
                ? "No messages match your search"
                : "Start the conversation!"}
            </p>
          </div>
        )}

        {filteredMessages.map((msg, idx) => {
          const prevMsg = filteredMessages[idx - 1];
          const showDateSep =
            !prevMsg ||
            new Date(msg.createdAt).toDateString() !==
              new Date(prevMsg.createdAt).toDateString();

          const replyMsg = msg.replyTo
            ? chatMessages.find((m) => m.id === msg.replyTo)
            : undefined;

          const isLastSent = msg.senderId === currentUid && idx === lastSentIdx;

          return (
            <React.Fragment key={msg.id}>
              {showDateSep && (
                <div className="flex items-center gap-3 px-4 py-2">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">
                    {new Date(msg.createdAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <Separator className="flex-1" />
                </div>
              )}
              <MessageBubble
                message={msg}
                isSender={msg.senderId === currentUid}
                currentUid={currentUid}
                senderUser={users[msg.senderId]}
                replyToMessage={replyMsg}
                participants={participants}
                onReact={(emoji) =>
                  reactToMessage(chatId, msg.id, emoji, currentUid)
                }
                onReply={() => setReplyToMessage(msg)}
                onEdit={
                  msg.senderId === currentUid
                    ? () => {
                        setEditingMessage(msg);
                        setInputText(msg.text);
                        inputRef.current?.focus();
                      }
                    : undefined
                }
                onDeleteForMe={() =>
                  deleteMessageForMe(chatId, msg.id, currentUid)
                }
                onDeleteForEveryone={
                  msg.senderId === currentUid
                    ? () => deleteMessageForEveryone(chatId, msg.id)
                    : undefined
                }
                onForward={() => {
                  setForwardingMessage(msg);
                  setShowForwardModal(true);
                }}
                isLastMessage={isLastSent}
              />
            </React.Fragment>
          );
        })}

        {/* Typing indicator with user info */}
        {isOtherTyping && <TypingIndicator user={otherUser} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply/Edit bar */}
      {(replyToMessage || editingMessage) && (
        <div className="flex items-center gap-3 px-4 py-2 border-t border-border bg-muted/30">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary font-medium">
              {editingMessage
                ? "Editing message"
                : `Reply to @${users[replyToMessage!.senderId]?.username}`}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {(editingMessage ?? replyToMessage)?.text}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6"
            onClick={() => {
              setReplyToMessage(null);
              setEditingMessage(null);
              setInputText("");
            }}
          >
            ✕
          </Button>
        </div>
      )}

      {/* Input bar */}
      {isBlocked || isBlockedByOther ? (
        <div className="px-4 py-3 border-t border-border bg-background text-center">
          <p className="text-sm text-muted-foreground">
            {isBlocked
              ? "You blocked this user"
              : "You can't message this person"}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-3 border-t border-border bg-background input-bar-mobile">
          <EmojiPicker onEmojiSelect={(e) => setInputText((p) => p + e)} />
          <Input
            ref={inputRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            className="flex-1 rounded-full bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary px-4"
            disabled={isSending}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <Image size={22} />
          </Button>
          {inputText.trim() ? (
            <Button
              size="icon"
              onClick={handleSend}
              disabled={isSending}
              className="rounded-full flex-shrink-0"
            >
              <Send size={16} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <Mic size={22} />
            </Button>
          )}
        </div>
      )}

      {/* Forward modal */}
      <ForwardModal
        open={showForwardModal}
        onClose={() => {
          setShowForwardModal(false);
          setForwardingMessage(null);
        }}
        chats={allChats}
        users={users}
        currentUid={currentUid}
        onForward={(targetChatId) => {
          if (forwardingMessage) {
            forwardMessage(forwardingMessage, targetChatId, currentUid);
          }
        }}
      />
    </div>
  );
}

function formatLastSeen(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
