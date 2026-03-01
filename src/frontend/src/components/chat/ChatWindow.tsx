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
  Loader2,
  Mic,
  MicOff,
  MoreHorizontal,
  PhoneOff,
  Pin,
  Search,
  Send,
  Square,
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);

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

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (recordingStreamRef.current) {
        for (const track of recordingStreamRef.current.getTracks()) {
          track.stop();
        }
      }
    };
  }, []);

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

      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      setIsUploading(true);
      setUploadProgress(0);

      try {
        // For now use a local object URL — in production this would upload to storage
        // and return a permanent URL. We show a local preview immediately.
        const localUrl = URL.createObjectURL(file);

        await sendMessage(
          chatId,
          currentUid,
          "",
          isImage ? "image" : isVideo ? "video" : "file",
          {
            mediaUrl: localUrl,
            mediaName: file.name,
          },
        );
        toast.success(`${isImage ? "Photo" : isVideo ? "Video" : "File"} sent`);
      } catch {
        toast.error("Failed to send file");
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        e.target.value = "";
      }
    },
    [chatId, currentUid, sendMessage],
  );

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        // Stop all tracks
        for (const track of stream.getTracks()) track.stop();
        recordingStreamRef.current = null;

        if (blob.size === 0) return;

        setIsUploading(true);
        try {
          const voiceUrl = URL.createObjectURL(blob);
          const duration = recordingDuration;
          await sendMessage(chatId, currentUid, "", "voice", {
            mediaUrl: voiceUrl,
            mediaDuration: duration,
          });
          toast.success("Voice message sent");
        } catch {
          toast.error("Failed to send voice message");
        } finally {
          setIsUploading(false);
        }
      };

      recorder.start(100); // collect in 100ms chunks
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch {
      toast.error("Microphone permission denied");
    }
  }, [chatId, currentUid, sendMessage, recordingDuration]);

  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    setIsRecording(false);
    setRecordingDuration(0);
  }, []);

  const cancelRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
      // Clear the chunks so nothing gets sent
      audioChunksRef.current = [];
    }
    if (recordingStreamRef.current) {
      for (const track of recordingStreamRef.current.getTracks()) {
        track.stop();
      }
      recordingStreamRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);
    toast.info("Recording cancelled");
  }, []);

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

  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

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
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-background/95 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="-ml-1 md:hidden rounded-xl w-9 h-9"
          >
            <ArrowLeft size={18} />
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
            <p className="font-semibold text-sm truncate tracking-tight">
              @{otherUser.username}
            </p>
            <p className="text-xs text-muted-foreground">
              {isOtherTyping ? (
                <span className="text-primary font-medium">typing...</span>
              ) : otherUser.onlineStatus ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-online-dot inline-block" />
                  Active now
                </span>
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

      {/* Upload progress */}
      {isUploading && (
        <div className="px-4 py-1.5 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2">
            <Loader2 size={12} className="text-primary animate-spin" />
            <span className="text-xs text-primary font-medium">
              Uploading media...
            </span>
            {uploadProgress > 0 && (
              <span className="text-xs text-muted-foreground">
                {uploadProgress}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-scroll py-2 chat-messages-bg">
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
        <div className="px-4 py-4 border-t border-border bg-background text-center">
          <p className="text-sm text-muted-foreground">
            {isBlocked
              ? "You blocked this user"
              : "You can't message this person"}
          </p>
        </div>
      ) : isRecording ? (
        /* Recording UI */
        <div className="flex items-center gap-3 px-4 py-3 border-t border-border bg-background input-bar-mobile">
          <div className="w-2.5 h-2.5 rounded-full bg-destructive record-pulse flex-shrink-0" />
          {/* Waveform animation */}
          <div className="flex items-center gap-0.5 flex-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="wave-bar w-1 rounded-full bg-destructive/70"
                style={{ animationDelay: `${(i - 1) * 0.1}s` }}
              />
            ))}
            <span className="ml-2 text-sm font-mono text-destructive font-medium tabular-nums">
              {formatRecordingTime(recordingDuration)}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={cancelRecording}
            className="text-muted-foreground hover:text-destructive w-9 h-9 rounded-xl flex-shrink-0"
            title="Cancel recording"
          >
            <MicOff size={18} />
          </Button>
          <Button
            size="icon"
            onClick={stopRecording}
            className="bg-destructive hover:bg-destructive/90 w-9 h-9 rounded-xl flex-shrink-0"
            title="Stop and send"
          >
            <Square size={14} className="text-white fill-white" />
          </Button>
        </div>
      ) : (
        <div className="flex items-end gap-2 px-3 py-3 border-t border-border bg-background input-bar-mobile">
          <EmojiPicker onEmojiSelect={(e) => setInputText((p) => p + e)} />
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              className="rounded-2xl bg-muted/60 border border-border/60 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/40 px-4 h-10 text-sm transition-all"
              disabled={isSending || isUploading}
            />
          </div>
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
            disabled={isUploading}
            className="text-muted-foreground hover:text-primary flex-shrink-0 h-10 w-10 rounded-xl transition-colors"
          >
            {isUploading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Image size={20} />
            )}
          </Button>
          {inputText.trim() ? (
            <Button
              size="icon"
              onClick={handleSend}
              disabled={isSending}
              className="rounded-xl flex-shrink-0 h-10 w-10 gradient-btn shadow-sm"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
              ) : (
                <Send size={15} className="text-white" />
              )}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={startRecording}
              className="text-muted-foreground hover:text-primary flex-shrink-0 h-10 w-10 rounded-xl transition-colors"
              title="Record voice message"
            >
              <Mic size={20} />
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
