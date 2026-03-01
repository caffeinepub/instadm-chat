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
import { Principal } from "@icp-sdk/core/principal";
import {
  Archive,
  ArrowLeft,
  BarChart2,
  Bold,
  Code,
  Image,
  Images,
  Italic,
  Loader2,
  Mic,
  MicOff,
  MoreHorizontal,
  Pin,
  Search,
  Send,
  Square,
  Strikethrough,
  Timer,
  VolumeX,
  Zap,
} from "lucide-react";
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { useChat } from "../../contexts/ChatContext";
import { useActor } from "../../hooks/useActor";
import { saveUser } from "../../services/chatService";
import {
  type Poll,
  awardBadge,
  getPollsForChat,
  incrementMsgCount,
  setSelfDestructTimer,
} from "../../services/featureService";
import { backendProfileToAppUser } from "../../services/profileService";
import type { Message } from "../../types";
import { EmojiPicker } from "./EmojiPicker";
import { ForwardModal } from "./ForwardModal";
import { MediaGallery } from "./MediaGallery";
import { MessageBubble } from "./MessageBubble";
import { PollBubble } from "./PollBubble";
import { PollModal } from "./PollModal";
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
    refreshChats,
    chatIdToOtherUid,
  } = useChat();
  const { currentUser } = useAuth();
  const { actor } = useActor();

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
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [chatPolls, setChatPolls] = useState<Poll[]>([]);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [selfDestructDelay, setSelfDestructDelay] = useState<number | null>(
    null,
  ); // ms
  const [showFormattingBar, setShowFormattingBar] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUid = currentUser!.uid;

  // Derive otherUid from chat participants
  // Falls back to chatIdToOtherUid map (populated by openChat) before chats state settles
  const otherUid = useMemo(() => {
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      return chat.participants.find((p) => p !== currentUid) ?? "";
    }
    // Fallback: use the map populated synchronously by openChat
    return chatIdToOtherUid[chatId] ?? "";
  }, [chats, chatId, currentUid, chatIdToOtherUid]);

  const chat = chats.find((c) => c.id === chatId);
  const otherUser = users[otherUid];
  const chatMessages = allMessages[chatId] ?? [];

  // ─── Self-healing: fetch missing chat/user from backend ──────────────────
  const healingRef = useRef(false);
  useEffect(() => {
    if (chat && otherUser) return; // Already resolved
    if (!actor || !chatId || healingRef.current) return;

    healingRef.current = true;

    const heal = async () => {
      try {
        // Refresh chats first — this will populate otherUser from backend
        refreshChats();

        // If we still don't have otherUid from chat participants, we can't heal
        if (!otherUid) return;

        const otherPrincipal = Principal.fromText(otherUid);

        // Fetch other user's profile if missing
        if (!otherUser) {
          try {
            const profile = await actor.getUserProfile(otherPrincipal);
            if (profile) {
              const appUser = backendProfileToAppUser(profile);
              saveUser(appUser);
              refreshChats();
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      } finally {
        setTimeout(() => {
          healingRef.current = false;
        }, 1500);
      }
    };

    const timer = setTimeout(heal, 200);
    return () => clearTimeout(timer);
  }, [chat, otherUser, chatId, otherUid, actor, refreshChats]);

  // Reset healing flag when chatId changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: chatId change should reset healing
  useEffect(() => {
    healingRef.current = false;
    setLoadingTimedOut(false);
  }, [chatId]);

  // Loading timeout: if chat/user still not resolved after 6s, show error + retry
  useEffect(() => {
    if (chat && otherUser) return; // Already resolved
    const timer = setTimeout(() => {
      setLoadingTimedOut(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, [chat, otherUser]);

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

  // Load polls for this chat
  useEffect(() => {
    setChatPolls(getPollsForChat(chatId));
  }, [chatId]);

  // Formatting helpers
  const wrapSelectedText = useCallback(
    (prefix: string, suffix: string) => {
      const input = inputRef.current;
      if (!input) return;
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      const selected = inputText.slice(start, end);
      const replacement = selected
        ? `${prefix}${selected}${suffix}`
        : `${prefix}${suffix}`;
      const newText =
        inputText.slice(0, start) + replacement + inputText.slice(end);
      setInputText(newText);
      // Restore focus
      setTimeout(() => {
        input.focus();
        if (!selected) {
          const newPos = start + prefix.length;
          input.setSelectionRange(newPos, newPos);
        }
      }, 0);
    },
    [inputText],
  );

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
        const msg = await sendMessage(chatId, currentUid, text, "text", {
          replyTo: replyToMessage?.id,
        });
        setReplyToMessage(null);

        // Badge tracking
        const count = incrementMsgCount(currentUid);
        if (count === 1) {
          const awarded = awardBadge(currentUid, "first_message");
          if (awarded) toast.success("💬 Badge Earned: First Message!");
        } else if (count === 100) {
          const awarded = awardBadge(currentUid, "100_messages");
          if (awarded) toast.success("🏆 Badge Earned: Chat Champion!");
        }

        // Self-destruct timer
        if (selfDestructDelay && selfDestructDelay > 0 && msg.id) {
          const destroyAt = Date.now() + selfDestructDelay;
          setSelfDestructTimer(msg.id, chatId, destroyAt);
          // Schedule auto-delete
          setTimeout(() => {
            deleteMessageForEveryone(chatId, msg.id).catch(() => {});
          }, selfDestructDelay);
        }
      } catch {
        toast.error("Failed to send message");
      } finally {
        setIsSending(false);
      }
    }
    setInputText("");
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
    selfDestructDelay,
    deleteMessageForEveryone,
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

      // File size limit: 2MB for images/files, 5MB for videos
      const maxSize = isVideo ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`File too large. Max ${isVideo ? "5MB" : "2MB"}.`);
        e.target.value = "";
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      try {
        // Convert to base64 data URL so it persists across sessions
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        await sendMessage(
          chatId,
          currentUid,
          "",
          isImage ? "image" : isVideo ? "video" : "file",
          {
            mediaUrl: base64,
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
        for (const track of stream.getTracks()) track.stop();
        recordingStreamRef.current = null;

        if (blob.size === 0) return;

        setIsUploading(true);
        try {
          // Convert to base64 data URL so it persists across page reloads
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const duration = recordingDuration;
          await sendMessage(chatId, currentUid, "", "voice", {
            mediaUrl: base64,
            mediaDuration: duration,
          });
          toast.success("Voice message sent");
        } catch {
          toast.error("Failed to send voice message");
        } finally {
          setIsUploading(false);
        }
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);

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

  // Show loading state while chat/user resolves (with a max wait)
  if (!chat || !otherUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background gap-4 relative">
        {onBack && (
          <div className="absolute top-0 left-0 right-0 flex items-center gap-2 px-4 py-3 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="md:hidden rounded-xl w-9 h-9"
            >
              <ArrowLeft size={18} />
            </Button>
          </div>
        )}
        {loadingTimedOut ? (
          <div className="flex flex-col items-center gap-4 mt-8 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Could not open chat
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Unable to load the conversation. Please try again.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => {
                  setLoadingTimedOut(false);
                  healingRef.current = false;
                  refreshChats();
                }}
              >
                Retry
              </Button>
              {onBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl"
                  onClick={onBack}
                >
                  Go Back
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 mt-8">
            <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
              <Loader2 size={28} className="text-primary animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Opening chat...</p>
              <p className="text-xs text-muted-foreground mt-1">
                Setting up your conversation
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const participants = chat.participants
    .map((uid) => users[uid])
    .filter(Boolean);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2.5 border-b border-border bg-background/95 backdrop-blur-md sticky top-0 z-10 shadow-sm min-h-[56px]">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="md:hidden rounded-xl w-9 h-9 flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </Button>
        )}

        <button
          type="button"
          className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity overflow-hidden"
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

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen((v) => !v)}
            className={cn("w-9 h-9", searchOpen && "bg-accent")}
          >
            <Search size={17} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMediaGallery(true)}
            className="w-9 h-9"
            title="Shared Media"
          >
            <Images size={17} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-9 h-9">
                <MoreHorizontal size={17} />
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

        {/* Polls for this chat */}
        {chatPolls.map((poll) => (
          <div
            key={poll.id}
            className={cn(
              "flex items-end gap-2 px-4 py-1",
              poll.createdBy === currentUid ? "flex-row-reverse" : "flex-row",
            )}
          >
            <PollBubble
              poll={poll}
              currentUid={currentUid}
              isSender={poll.createdBy === currentUid}
            />
          </div>
        ))}

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

        {/* Typing indicator */}
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
        <div className="flex items-center gap-3 px-4 py-3 border-t border-border bg-background input-bar-mobile">
          <div className="w-2.5 h-2.5 rounded-full bg-destructive record-pulse flex-shrink-0" />
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
        <div className="flex flex-col border-t border-border bg-background">
          {/* Formatting toolbar */}
          {showFormattingBar && (
            <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/50 bg-muted/30">
              <button
                type="button"
                onClick={() => wrapSelectedText("**", "**")}
                className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors font-bold text-xs"
                title="Bold"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => wrapSelectedText("_", "_")}
                className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors italic text-xs"
                title="Italic"
              >
                I
              </button>
              <button
                type="button"
                onClick={() => wrapSelectedText("~~", "~~")}
                className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors line-through text-xs"
                title="Strikethrough"
              >
                S
              </button>
              <button
                type="button"
                onClick={() => wrapSelectedText("`", "`")}
                className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors font-mono text-xs"
                title="Code"
              >
                {"</>"}
              </button>
              <div className="ml-auto flex items-center gap-1">
                {/* Self-destruct selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center gap-1 px-2 h-7 rounded-lg text-xs font-medium transition-colors",
                        selfDestructDelay
                          ? "bg-destructive/10 text-destructive border border-destructive/30"
                          : "hover:bg-accent text-muted-foreground",
                      )}
                      title="Self-destruct timer"
                    >
                      <Timer size={12} />
                      {selfDestructDelay
                        ? selfDestructDelay < 60000
                          ? `${selfDestructDelay / 1000}s`
                          : selfDestructDelay < 3600000
                            ? `${selfDestructDelay / 60000}m`
                            : `${selfDestructDelay / 3600000}h`
                        : "Timer"}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl w-36">
                    <DropdownMenuItem
                      onClick={() => setSelfDestructDelay(null)}
                    >
                      None
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelfDestructDelay(10000)}
                    >
                      10 seconds
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelfDestructDelay(30000)}
                    >
                      30 seconds
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelfDestructDelay(60000)}
                    >
                      1 minute
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelfDestructDelay(300000)}
                    >
                      5 minutes
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelfDestructDelay(3600000)}
                    >
                      1 hour
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          <div className="flex items-end gap-1.5 sm:gap-2 px-2 sm:px-3 py-3 input-bar-mobile">
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
            {/* Formatting toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFormattingBar((v) => !v)}
              className={cn(
                "text-muted-foreground hover:text-primary flex-shrink-0 h-10 w-10 rounded-xl transition-colors",
                showFormattingBar && "bg-accent text-foreground",
              )}
              title="Formatting"
            >
              <Bold size={16} />
            </Button>
            {/* Poll button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPollModal(true)}
              className="text-muted-foreground hover:text-primary flex-shrink-0 h-10 w-10 rounded-xl transition-colors"
              title="Create Poll"
            >
              <BarChart2 size={18} />
            </Button>
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

      {/* Poll modal */}
      <PollModal
        open={showPollModal}
        chatId={chatId}
        createdBy={currentUid}
        onClose={() => setShowPollModal(false)}
        onPollCreated={() => {
          setChatPolls(getPollsForChat(chatId));
          setShowPollModal(false);
        }}
      />

      {/* Media gallery */}
      <MediaGallery
        open={showMediaGallery}
        messages={chatMessages}
        onClose={() => setShowMediaGallery(false)}
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
