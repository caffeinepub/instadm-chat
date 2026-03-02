import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Principal } from "@icp-sdk/core/principal";
import {
  Archive,
  ArrowLeft,
  BarChart2,
  Bold,
  CalendarClock,
  CheckSquare,
  Image,
  Images,
  Link,
  Loader2,
  Mic,
  MicOff,
  MoreHorizontal,
  Palette,
  Pin,
  Plus,
  Search,
  Send,
  Smile,
  Square,
  Timer,
  Undo2,
  VolumeX,
  X,
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
  CHAT_THEMES,
  type PinnedMessage,
  type Poll,
  type Report,
  addBookmark,
  addReport,
  addScheduledMessage,
  awardBadge,
  getChatTheme,
  getChatWallpaper,
  getDueMessages,
  getPinnedMessage,
  getPollsForChat,
  incrementMsgCount,
  isBookmarked,
  isMessageSaved,
  recordDailyActivity,
  removeBookmark,
  removeScheduledMessage,
  saveMessage,
  setChatTheme,
  setPinnedMessage,
  setSelfDestructTimer,
  shouldShowLastSeen,
  unsaveMessage,
  votePoll,
} from "../../services/featureService";
import { backendProfileToAppUser } from "../../services/profileService";
import type { Message } from "../../types";
import { EmojiPicker } from "./EmojiPicker";
import { ForwardModal } from "./ForwardModal";
import { MediaGallery } from "./MediaGallery";
import { MessageBubble } from "./MessageBubble";
import { PollBubble } from "./PollBubble";
import { PollModal } from "./PollModal";
import { StickerPanel } from "./StickerPanel";
import { TodoListPanel } from "./TodoListPanel";
import { TypingIndicator } from "./TypingIndicator";
import { UserAvatar } from "./UserAvatar";
import { WallpaperPicker } from "./WallpaperPicker";

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
    pendingChatUser,
    pendingChatContext,
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

  // Batch 2 feature state
  const [wallpaper, setWallpaper] = useState(() => getChatWallpaper(chatId));
  const [reportingMessage, setReportingMessage] = useState<Message | null>(
    null,
  );
  const [reportReason, setReportReason] = useState("Spam");
  const [bookmarkVersion, setBookmarkVersion] = useState(0); // trigger re-render
  const [scheduledAt, setScheduledAt] = useState("");
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  // Batch 3 features
  const [showTodoPanel, setShowTodoPanel] = useState(false);
  const [linkPreviewUrl, setLinkPreviewUrl] = useState<string | null>(null);
  // Batch 4 features
  const [pinnedMsg, setPinnedMsg] = useState<PinnedMessage | null>(() =>
    getPinnedMessage(chatId),
  );
  const [chatTheme, setChatThemeState] = useState(() => getChatTheme(chatId));
  const [savedVersion, setSavedVersion] = useState(0); // trigger re-render
  const [showThemePicker, setShowThemePicker] = useState(false);
  // Attachment popover (the [+] button)
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  // Undo send
  const [undoMsgId, setUndoMsgId] = useState<string | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkPreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUid = currentUser!.uid;

  // If pendingChatContext matches this chatId, use it directly — this is the most
  // reliable source because it's set atomically in openChat before any state settles
  const isPendingThisChat = pendingChatContext?.chatId === chatId;

  // Derive otherUid: pendingChatContext > chats state > chatIdToOtherUid map
  const otherUid = useMemo(() => {
    if (isPendingThisChat) return pendingChatContext!.otherUid;
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      return chat.participants.find((p) => p !== currentUid) ?? "";
    }
    // Fallback: use the map populated synchronously by openChat
    return chatIdToOtherUid[chatId] ?? "";
  }, [
    isPendingThisChat,
    pendingChatContext,
    chats,
    chatId,
    currentUid,
    chatIdToOtherUid,
  ]);

  const chat = chats.find((c) => c.id === chatId);
  // Use pendingChatContext first, then users map, then pendingChatUser
  const otherUser = useMemo(() => {
    if (isPendingThisChat) return pendingChatContext!.otherUser;
    return (
      (otherUid ? users[otherUid] : undefined) ??
      (pendingChatUser?.uid === otherUid ? pendingChatUser : null) ??
      undefined
    );
  }, [isPendingThisChat, pendingChatContext, users, otherUid, pendingChatUser]);
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
  useEffect(() => {
    healingRef.current = false;
    setLoadingTimedOut(false);
    setWallpaper(getChatWallpaper(chatId));
  }, [chatId]);

  // Scheduled message checker
  useEffect(() => {
    const interval = setInterval(() => {
      const due = getDueMessages(currentUid);
      for (const scheduled of due) {
        if (scheduled.chatId === chatId) {
          sendMessage(chatId, currentUid, scheduled.text, "text", {}).catch(
            () => {},
          );
          removeScheduledMessage(currentUid, scheduled.id);
          toast.success("Scheduled message sent!");
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [chatId, currentUid, sendMessage]);

  // Loading timeout: if chat/user still not resolved after 3s, show error + retry
  useEffect(() => {
    if (chat && otherUser) return; // Already resolved
    const timer = setTimeout(() => {
      setLoadingTimedOut(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [chat, otherUser]);

  const isBlocked = currentUser?.blockedUsers?.includes(otherUid) || false;
  const isBlockedByOther =
    otherUser?.blockedUsers?.includes(currentUid) || false;

  // Chat theme gradient for sender bubbles
  const senderGradient =
    CHAT_THEMES.find((t) => t.id === chatTheme)?.gradient ??
    "linear-gradient(135deg, #E1306C, #833AB4)";

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
      if (linkPreviewTimerRef.current)
        clearTimeout(linkPreviewTimerRef.current);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
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

  // Load polls for this chat — and derive live votes from the message stream
  // Votes are encoded as messages starting with __POLL_VOTE__:pollId:optionIndex:voterUid
  // This allows real-time vote syncing via the existing 500ms message polling.
  const livePollsWithVotes = useMemo(() => {
    const base = chatPolls;
    if (base.length === 0) return base;

    // Build derived votes map from messages
    const derivedVotes: Record<string, Record<string, number>> = {};
    for (const msg of chatMessages) {
      if (msg.text?.startsWith("__POLL_VOTE__:") && !msg.deletedForEveryone) {
        const parts = msg.text.split(":");
        // format: __POLL_VOTE__:pollId:optionIndex:voterUid
        if (parts.length >= 4) {
          const pollId = parts[1];
          const optionIndex = Number.parseInt(parts[2], 10);
          const voterUid = parts[3];
          if (!Number.isNaN(optionIndex)) {
            if (!derivedVotes[pollId]) derivedVotes[pollId] = {};
            // Later votes override earlier ones (last-write-wins per voter)
            derivedVotes[pollId][voterUid] = optionIndex;
          }
        }
      }
    }

    if (Object.keys(derivedVotes).length === 0) return base;

    return base.map((poll) => {
      const liveVotes = derivedVotes[poll.id];
      if (!liveVotes) return poll;
      // Merge: liveVotes (from messages) override localStorage votes
      return { ...poll, votes: { ...poll.votes, ...liveVotes } };
    });
  }, [chatPolls, chatMessages]);

  // Re-load polls when chat changes or messages update (to pick up new polls sent by either user)
  // biome-ignore lint/correctness/useExhaustiveDependencies: chatMessages.length is intentional trigger
  useEffect(() => {
    setChatPolls(getPollsForChat(chatId));
  }, [chatId, chatMessages.length]);

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
        // Track daily activity for streak
        recordDailyActivity(currentUid);

        // Self-destruct timer
        if (selfDestructDelay && selfDestructDelay > 0 && msg.id) {
          const destroyAt = Date.now() + selfDestructDelay;
          setSelfDestructTimer(msg.id, chatId, destroyAt);
          // Schedule auto-delete
          setTimeout(() => {
            deleteMessageForEveryone(chatId, msg.id).catch(() => {});
          }, selfDestructDelay);
        }

        // Undo send — show for 5 seconds
        setUndoMsgId(msg.id);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => {
          setUndoMsgId(null);
        }, 5000);
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

  // Bookmark handler
  const handleBookmark = useCallback(
    (msg: Message) => {
      const uid = currentUid;
      if (isBookmarked(uid, msg.id)) {
        removeBookmark(uid, msg.id);
        toast.success("Bookmark removed");
      } else {
        addBookmark(uid, {
          messageId: msg.id,
          chatId,
          text: msg.text,
          senderUsername: users[msg.senderId]?.username ?? msg.senderId,
          createdAt: Date.now(),
        });
        toast.success("Message bookmarked");
      }
      setBookmarkVersion((v) => v + 1);
    },
    [currentUid, chatId, users],
  );

  // Save/unsave message handler
  const handleSaveMessage = useCallback(
    (msg: Message) => {
      if (isMessageSaved(currentUid, msg.id)) {
        unsaveMessage(currentUid, msg.id);
        toast.success("Message unsaved");
      } else {
        saveMessage(currentUid, {
          id: `saved_${Date.now()}`,
          text: msg.text,
          mediaUrl: msg.mediaUrl,
          messageType: msg.messageType,
          createdAt: msg.createdAt,
          savedAt: Date.now(),
          sourceMessageId: msg.id,
          sourceChatId: chatId,
          senderUsername: users[msg.senderId]?.username,
        });
        toast.success("Message saved");
      }
      setSavedVersion((v) => v + 1);
    },
    [currentUid, chatId, users],
  );

  // Pin/unpin message handler
  const handlePinMessage = useCallback(
    (msg: Message) => {
      const existing = getPinnedMessage(chatId);
      if (existing?.messageId === msg.id) {
        setPinnedMessage(chatId, null);
        setPinnedMsg(null);
        toast.success("Message unpinned");
      } else {
        const pin: PinnedMessage = {
          messageId: msg.id,
          text: msg.text || `📎 ${msg.messageType}`,
          senderId: msg.senderId,
          pinnedAt: Date.now(),
        };
        setPinnedMessage(chatId, pin);
        setPinnedMsg(pin);
        toast.success("Message pinned");
      }
    },
    [chatId],
  );

  // Chat theme handler
  const handleThemeChange = useCallback(
    (themeId: (typeof CHAT_THEMES)[number]["id"]) => {
      setChatTheme(chatId, themeId);
      setChatThemeState(themeId);
      setShowThemePicker(false);
    },
    [chatId],
  );

  // Poll vote handler — sends a hidden vote message for real-time sync
  const handlePollVote = useCallback(
    (pollId: string, optionIndex: number) => {
      // Encode vote as a hidden message: __POLL_VOTE__:pollId:optionIndex:voterUid
      const voteText = `__POLL_VOTE__:${pollId}:${optionIndex}:${currentUid}`;
      sendMessage(chatId, currentUid, voteText, "text", {}).catch(() => {});
      // Also update localStorage poll immediately for instant local feedback
      const updated = votePoll(pollId, currentUid, optionIndex);
      const updatedPoll = updated[pollId];
      if (updatedPoll) {
        setChatPolls((prev) =>
          prev.map((p) => (p.id === pollId ? updatedPoll : p)),
        );
      }
    },
    [chatId, currentUid, sendMessage],
  );

  // Schedule send handler
  const handleScheduleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || !scheduledAt) return;
    const ts = new Date(scheduledAt).getTime();
    if (Number.isNaN(ts) || ts <= Date.now()) {
      toast.error("Please choose a future date and time");
      return;
    }
    addScheduledMessage(currentUid, {
      id: `sched_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      chatId,
      text,
      scheduledAt: ts,
    });
    setInputText("");
    setScheduledAt("");
    setShowSchedulePicker(false);
    toast.success(`Message scheduled for ${new Date(ts).toLocaleString()}`);
  }, [inputText, scheduledAt, currentUid, chatId]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputText(val);
      setTyping(chatId, currentUid, val.length > 0);

      // Link preview detection (debounced 600ms)
      if (linkPreviewTimerRef.current)
        clearTimeout(linkPreviewTimerRef.current);
      const urlMatch = val.match(/https?:\/\/\S+/);
      if (urlMatch) {
        linkPreviewTimerRef.current = setTimeout(() => {
          try {
            const url = new URL(urlMatch[0]);
            setLinkPreviewUrl(url.hostname);
          } catch {
            setLinkPreviewUrl(null);
          }
        }, 600);
      } else {
        setLinkPreviewUrl(null);
      }
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
    (m) =>
      !m.deletedFor.includes(currentUid) &&
      !m.text?.startsWith("__POLL_VOTE__:"), // hide poll vote sync messages
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

  // Show loading state only when BOTH chat AND otherUid are missing.
  // If we have otherUid (from pendingChatContext or chatIdToOtherUid map),
  // render the chat immediately — don't wait for chats state to settle.
  const canRender = otherUid || chat;
  if (!canRender || !otherUser) {
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

  const participants = (
    chat?.participants ?? [currentUid, otherUid].filter(Boolean)
  )
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
              ) : shouldShowLastSeen(
                  otherUid,
                  currentUid,
                  currentUser?.following ?? [],
                ) ? (
                `Active ${formatLastSeen(otherUser.lastSeen)}`
              ) : (
                <span className="text-muted-foreground/50">—</span>
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
            data-ocid="chat.search_input"
          >
            <Search size={17} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9"
                data-ocid="chat.dropdown_menu"
              >
                <MoreHorizontal size={17} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-xl overflow-hidden p-0 w-52"
            >
              <DropdownMenuItem onClick={() => setShowMediaGallery(true)}>
                <Images size={14} className="mr-2" />
                Shared Media
              </DropdownMenuItem>
              {/* Chat theme inline */}
              <DropdownMenuItem onClick={() => setShowThemePicker((v) => !v)}>
                <Palette size={14} className="mr-2" />
                Chat Theme
              </DropdownMenuItem>
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
                {chat?.vanishMode
                  ? "Turn off vanish mode"
                  : "Turn on vanish mode"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowTodoPanel(true)}>
                <CheckSquare size={14} className="mr-2" />
                Shared To-Do List
              </DropdownMenuItem>
              {/* Wallpaper picker embedded in dropdown */}
              <WallpaperPicker
                chatId={chatId}
                onSelect={(v) => setWallpaper(v)}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Chat theme picker popover — detached so it can be triggered from dropdown */}
        <Popover open={showThemePicker} onOpenChange={setShowThemePicker}>
          <PopoverTrigger asChild>
            <span className="sr-only">Theme trigger</span>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="bottom"
            className="w-64 rounded-2xl p-3"
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Chat Theme
            </p>
            <div className="flex flex-wrap gap-2">
              {CHAT_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleThemeChange(theme.id)}
                  title={theme.name}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all flex-shrink-0",
                    chatTheme === theme.id &&
                      "ring-2 ring-offset-2 ring-primary scale-110",
                  )}
                  style={{ background: theme.gradient }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
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

      {/* Pinned message banner */}
      {pinnedMsg && (
        <button
          type="button"
          className="pinned-banner w-full text-left"
          onClick={() => {
            // Scroll to pinned message
            const el = document.querySelector(
              `[data-msg-id="${pinnedMsg.messageId}"]`,
            );
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        >
          <Pin size={11} className="text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-primary font-semibold uppercase tracking-wider mr-1">
              Pinned
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {pinnedMsg.text.slice(0, 60)}
              {pinnedMsg.text.length > 60 ? "…" : ""}
            </span>
          </div>
          <button
            type="button"
            className="flex-shrink-0 text-muted-foreground hover:text-foreground p-0.5"
            onClick={(e) => {
              e.stopPropagation();
              setPinnedMessage(chatId, null);
              setPinnedMsg(null);
            }}
          >
            <X size={11} />
          </button>
        </button>
      )}

      {/* Vanish mode indicator */}
      {chat?.vanishMode && (
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
      <div
        className="flex-1 overflow-y-auto chat-scroll py-2 chat-messages-bg"
        style={wallpaper ? { background: wallpaper } : undefined}
      >
        {filteredMessages.length === 0 && livePollsWithVotes.length === 0 && (
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

        {/* Render messages and polls in chronological order */}
        {(() => {
          // Build a unified timeline item list
          type TimelineItem =
            | {
                kind: "message";
                msg: (typeof filteredMessages)[0];
                idx: number;
              }
            | { kind: "poll"; poll: (typeof livePollsWithVotes)[0] };

          const timeline: TimelineItem[] = [
            ...filteredMessages.map((msg, idx) => ({
              kind: "message" as const,
              msg,
              idx,
            })),
            ...livePollsWithVotes.map((poll) => ({
              kind: "poll" as const,
              poll,
            })),
          ].sort((a, b) => {
            const ta =
              a.kind === "message" ? a.msg.createdAt : a.poll.createdAt;
            const tb =
              b.kind === "message" ? b.msg.createdAt : b.poll.createdAt;
            return ta - tb;
          });

          let prevDate: string | null = null;

          return timeline.map((item) => {
            const itemDate =
              item.kind === "message"
                ? new Date(item.msg.createdAt).toDateString()
                : new Date(item.poll.createdAt).toDateString();
            const showDateSep = prevDate !== itemDate;
            prevDate = itemDate;
            const createdAt =
              item.kind === "message"
                ? item.msg.createdAt
                : item.poll.createdAt;

            if (item.kind === "poll") {
              return (
                <React.Fragment key={`poll_${item.poll.id}`}>
                  {showDateSep && (
                    <div className="flex items-center gap-3 px-4 py-2">
                      <Separator className="flex-1" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <Separator className="flex-1" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex items-end gap-2 px-4 py-1",
                      item.poll.createdBy === currentUid
                        ? "flex-row-reverse"
                        : "flex-row",
                    )}
                  >
                    <PollBubble
                      poll={item.poll}
                      currentUid={currentUid}
                      isSender={item.poll.createdBy === currentUid}
                      onVote={handlePollVote}
                    />
                  </div>
                </React.Fragment>
              );
            }

            const { msg, idx } = item;
            const replyMsg = msg.replyTo
              ? chatMessages.find((m) => m.id === msg.replyTo)
              : undefined;
            const isLastSent =
              msg.senderId === currentUid && idx === lastSentIdx;

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
                <div data-msg-id={msg.id}>
                  <MessageBubble
                    message={msg}
                    isSender={msg.senderId === currentUid}
                    currentUid={currentUid}
                    senderUser={users[msg.senderId]}
                    replyToMessage={replyMsg}
                    participants={participants}
                    senderGradient={senderGradient}
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
                    onBookmark={() => handleBookmark(msg)}
                    isBookmarked={
                      bookmarkVersion >= 0 && isBookmarked(currentUid, msg.id)
                    }
                    onSave={() => handleSaveMessage(msg)}
                    isSaved={
                      savedVersion >= 0 && isMessageSaved(currentUid, msg.id)
                    }
                    onPin={() => handlePinMessage(msg)}
                    isPinned={pinnedMsg?.messageId === msg.id}
                    onReport={
                      msg.senderId !== currentUid
                        ? () => setReportingMessage(msg)
                        : undefined
                    }
                    isLastMessage={isLastSent}
                  />
                </div>
              </React.Fragment>
            );
          });
        })()}

        {/* Typing indicator */}
        {isOtherTyping && <TypingIndicator user={otherUser} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Undo send banner */}
      {undoMsgId && (
        <div className="undo-banner flex items-center gap-3 px-4 py-2 border-t border-border bg-muted/30">
          <span className="text-xs text-muted-foreground flex-1">
            Message sent
          </span>
          <button
            type="button"
            onClick={() => {
              if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
              const msgId = undoMsgId;
              setUndoMsgId(null);
              deleteMessageForEveryone(chatId, msgId).catch(() => {});
              toast.success("Message unsent");
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
          >
            <Undo2 size={12} />
            Undo
          </button>
        </div>
      )}

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
          {/* Formatting toolbar — shown only when toggled via [+] menu */}
          {showFormattingBar && (
            <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/50 bg-muted/20">
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
              {/* Self-destruct timer inside formatting bar */}
              <div className="ml-auto">
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

          {/* Link preview pill */}
          {linkPreviewUrl && (
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 bg-muted/20">
              <Link size={11} className="text-primary flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate flex-1">
                {linkPreviewUrl}
              </span>
              <button
                type="button"
                onClick={() => setLinkPreviewUrl(null)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Compact input row: [+]  [INPUT FIELD]  [mic/send] */}
          <div className="flex items-center gap-2 px-3 py-2.5 input-bar-mobile">
            {/* [+] Attachment popover */}
            <Popover open={showAttachMenu} onOpenChange={setShowAttachMenu}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "flex-shrink-0 h-9 w-9 rounded-full transition-colors border border-border/60",
                    showAttachMenu
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-muted-foreground hover:text-primary hover:border-primary/40",
                  )}
                  title="Attachments & tools"
                  data-ocid="chat.open_modal_button"
                >
                  <Plus
                    size={17}
                    className={cn(
                      "transition-transform",
                      showAttachMenu && "rotate-45",
                    )}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                side="top"
                sideOffset={8}
                className="w-auto p-3 rounded-2xl shadow-lg"
              >
                <div className="grid grid-cols-3 gap-1.5">
                  {/* Photo/Video */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl hover:bg-accent transition-colors min-w-[64px]"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-500/15 flex items-center justify-center">
                      <Image size={17} className="text-blue-500" />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Photo
                    </span>
                  </button>
                  {/* Poll */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      setShowPollModal(true);
                    }}
                    className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl hover:bg-accent transition-colors min-w-[64px]"
                    data-ocid="chat.open_modal_button"
                  >
                    <div className="w-9 h-9 rounded-full bg-green-500/15 flex items-center justify-center">
                      <BarChart2 size={17} className="text-green-500" />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Poll
                    </span>
                  </button>
                  {/* Sticker */}
                  <div className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl min-w-[64px]">
                    <StickerPanel
                      onStickerSelect={(sticker) => {
                        setShowAttachMenu(false);
                        setInputText(sticker);
                        setTimeout(() => {
                          sendMessage(
                            chatId,
                            currentUid,
                            sticker,
                            "text",
                            {},
                          ).catch(() => {});
                          setInputText("");
                        }, 50);
                      }}
                      compact
                    />
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Sticker
                    </span>
                  </div>
                  {/* Schedule */}
                  <Popover
                    open={showSchedulePicker}
                    onOpenChange={setShowSchedulePicker}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setShowAttachMenu(false)}
                        className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl hover:bg-accent transition-colors min-w-[64px]"
                      >
                        <div className="w-9 h-9 rounded-full bg-orange-500/15 flex items-center justify-center">
                          <CalendarClock
                            size={17}
                            className="text-orange-500"
                          />
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground">
                          Schedule
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      side="top"
                      className="w-72 rounded-2xl p-4 schedule-popover"
                    >
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Schedule Message
                      </p>
                      <div className="space-y-3">
                        <div>
                          <Label className="settings-label mb-1.5 block">
                            Message text
                          </Label>
                          <Input
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Your message..."
                            className="rounded-xl text-sm h-8"
                          />
                        </div>
                        <div>
                          <Label className="settings-label mb-1.5 block">
                            Send at
                          </Label>
                          <input
                            type="datetime-local"
                            value={scheduledAt}
                            onChange={(e) => setScheduledAt(e.target.value)}
                            className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                          />
                        </div>
                        <Button
                          size="sm"
                          className="w-full rounded-xl gradient-btn"
                          onClick={handleScheduleSend}
                          disabled={!inputText.trim() || !scheduledAt}
                        >
                          <span className="text-white text-xs">Schedule</span>
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {/* Format */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      setShowFormattingBar((v) => !v);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl hover:bg-accent transition-colors min-w-[64px]",
                      showFormattingBar && "bg-accent",
                    )}
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center",
                        showFormattingBar
                          ? "bg-primary/20"
                          : "bg-purple-500/15",
                      )}
                    >
                      <Bold
                        size={17}
                        className={
                          showFormattingBar ? "text-primary" : "text-purple-500"
                        }
                      />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Format
                    </span>
                  </button>
                  {/* Emoji */}
                  <div className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl min-w-[64px]">
                    <EmojiPicker
                      onEmojiSelect={(e) => {
                        setShowAttachMenu(false);
                        setInputText((p) => p + e);
                      }}
                      currentUid={currentUid}
                      compact
                    />
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Emoji
                    </span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Message input — takes all remaining space */}
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Message..."
                className="rounded-2xl bg-muted/60 border border-border/60 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/40 px-4 h-10 text-sm transition-all"
                disabled={isSending || isUploading}
                data-ocid="chat.input"
              />
            </div>

            {/* Right side: mic when empty, send when text present */}
            {inputText.trim() ? (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={isSending}
                className="rounded-full flex-shrink-0 h-10 w-10 gradient-btn shadow-sm"
                data-ocid="chat.submit_button"
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
                className="text-muted-foreground hover:text-primary flex-shrink-0 h-10 w-10 rounded-full transition-colors"
                title="Record voice message"
                data-ocid="chat.button"
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

      {/* Todo panel */}
      {showTodoPanel && (
        <TodoListPanel
          chatId={chatId}
          currentUid={currentUid}
          onClose={() => setShowTodoPanel(false)}
        />
      )}

      {/* Report modal */}
      <Dialog
        open={!!reportingMessage}
        onOpenChange={(open) => !open && setReportingMessage(null)}
      >
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Report Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Why are you reporting this message?
            </p>
            <Select value={reportReason} onValueChange={setReportReason}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {["Spam", "Harassment", "Inappropriate", "Other"].map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setReportingMessage(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl gradient-btn"
                onClick={() => {
                  if (!reportingMessage) return;
                  const report: Report = {
                    id: `report_${Date.now()}`,
                    messageId: reportingMessage.id,
                    chatId,
                    reason: reportReason,
                    reportedBy: currentUid,
                    createdAt: Date.now(),
                  };
                  addReport(currentUid, report);
                  setReportingMessage(null);
                  toast.success("Message reported. Thank you.");
                }}
              >
                <span className="text-white text-sm">Submit Report</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
