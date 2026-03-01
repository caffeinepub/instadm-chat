import { Badge } from "@/components/ui/badge";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BarChart2,
  Bell,
  Bold,
  Crown,
  Image,
  Images,
  Info,
  Loader2,
  LogOut,
  Mic,
  MicOff,
  MoreHorizontal,
  Send,
  Shield,
  Square,
  Users,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { useChat } from "../../contexts/ChatContext";
import {
  type GroupRole,
  type Poll,
  type Report,
  addReport,
  awardBadge,
  getAnnouncements,
  getGroupRoles,
  getPollsForChat,
  incrementMsgCount,
  initGroupRoles,
  setGroupRole,
} from "../../services/featureService";
import type { GroupChat, Message } from "../../types";
import { AnnouncementModal } from "./AnnouncementModal";
import { EmojiPicker } from "./EmojiPicker";
import { MediaGallery } from "./MediaGallery";
import { MessageBubble } from "./MessageBubble";
import { PollBubble } from "./PollBubble";
import { PollModal } from "./PollModal";
import { ThreadPanel } from "./ThreadPanel";
import { TypingIndicator } from "./TypingIndicator";
import { UserAvatar } from "./UserAvatar";

interface GroupChatWindowProps {
  group: GroupChat;
  onBack?: () => void;
}

export function GroupChatWindow({ group, onBack }: GroupChatWindowProps) {
  const {
    groupMessages: allGroupMessages,
    users,
    sendGroupMessage,
    markGroupSeen,
    leaveGroup,
    setGroupTyping,
    editMessage,
    deleteMessageForEveryone,
    reactToMessage,
  } = useChat();
  const { currentUser } = useAuth();

  const [inputText, setInputText] = useState("");
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showPollModal, setShowPollModal] = useState(false);
  const [groupPolls, setGroupPolls] = useState<Poll[]>([]);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [showFormattingBar, setShowFormattingBar] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [threadParent, setThreadParent] = useState<Message | null>(null);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [dismissedAnnouncement, setDismissedAnnouncement] = useState(false);
  const [groupRoles, setGroupRoles] = useState<Record<string, GroupRole>>({});
  const [reportingMessage, setReportingMessage] = useState<
    (typeof groupMsgs)[0] | null
  >(null);
  const [reportReason, setReportReason] = useState("Spam");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUid = currentUser!.uid;
  const groupMsgs = allGroupMessages[group.id] ?? [];

  // Mark seen when window opens or new messages arrive
  // biome-ignore lint/correctness/useExhaustiveDependencies: length-only dep is intentional
  useEffect(() => {
    markGroupSeen(group.id);
  }, [group.id, markGroupSeen, groupMsgs.length]);

  // Scroll to bottom on new message
  // biome-ignore lint/correctness/useExhaustiveDependencies: length-only dep is intentional
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupMsgs.length]);

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

  // Load polls, announcements, roles
  useEffect(() => {
    setGroupPolls(getPollsForChat(group.id));
    setAnnouncements(getAnnouncements(group.id));
    const roles = getGroupRoles(group.id);
    // Initialize roles if not set (admin = group.adminId)
    if (Object.keys(roles).length === 0) {
      initGroupRoles(group.id, group.adminId, group.members);
      setGroupRoles(getGroupRoles(group.id));
    } else {
      setGroupRoles(roles);
    }
  }, [group.id, group.adminId, group.members]);

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
        await editMessage(group.id, editingMessage.id, text);
        setEditingMessage(null);
      } catch {
        toast.error("Failed to edit message");
      }
    } else {
      setIsSending(true);
      try {
        await sendGroupMessage(group.id, currentUid, text, "text", {
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
      } catch {
        toast.error("Failed to send message");
      } finally {
        setIsSending(false);
      }
    }
    setInputText("");
    setGroupTyping(group.id, currentUid, false);
    inputRef.current?.focus();
  }, [
    inputText,
    isSending,
    editingMessage,
    replyToMessage,
    group.id,
    currentUid,
    editMessage,
    sendGroupMessage,
    setGroupTyping,
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
      setGroupTyping(group.id, currentUid, e.target.value.length > 0);
    },
    [group.id, currentUid, setGroupTyping],
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      setIsUploading(true);
      try {
        const localUrl = URL.createObjectURL(file);
        await sendGroupMessage(
          group.id,
          currentUid,
          "",
          isImage ? "image" : isVideo ? "video" : "file",
          { mediaUrl: localUrl, mediaName: file.name },
        );
        toast.success(`${isImage ? "Photo" : isVideo ? "Video" : "File"} sent`);
      } catch {
        toast.error("Failed to send file");
      } finally {
        setIsUploading(false);
        e.target.value = "";
      }
    },
    [group.id, currentUid, sendGroupMessage],
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
          const voiceUrl = URL.createObjectURL(blob);
          await sendGroupMessage(group.id, currentUid, "", "voice", {
            mediaUrl: voiceUrl,
            mediaDuration: recordingDuration,
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
  }, [group.id, currentUid, sendGroupMessage, recordingDuration]);

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

  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // Typing: show which members are typing (excluding self)
  const typingUsers = Object.entries(group.typing ?? {})
    .filter(([uid, val]) => uid !== currentUid && val)
    .map(([uid]) => users[uid]);

  // Last sent message index
  const lastSentIdx = (() => {
    for (let i = groupMsgs.length - 1; i >= 0; i--) {
      if (groupMsgs[i].senderId === currentUid) return i;
    }
    return -1;
  })();

  // Member avatars for header (up to 3)
  const memberAvatars = group.members
    .filter((uid) => uid !== currentUid)
    .slice(0, 3)
    .map((uid) => users[uid]);

  const _isAdmin = group.adminId === currentUid;
  const myRole = groupRoles[currentUid] ?? "member";
  const canManage = myRole === "admin" || myRole === "moderator";

  return (
    <div className="flex h-full bg-background overflow-hidden">
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

        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Stacked group avatars */}
          <div className="relative flex-shrink-0 w-10 h-10">
            {memberAvatars.length === 0 ? (
              <div className="w-10 h-10 rounded-full group-icon-gradient flex items-center justify-center">
                <Users size={18} className="text-white" />
              </div>
            ) : memberAvatars.length === 1 ? (
              <UserAvatar
                src={memberAvatars[0]?.profilePicture}
                username={memberAvatars[0]?.username ?? "?"}
                size="md"
                showOnline={false}
              />
            ) : (
              <div className="relative w-10 h-10">
                <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full border-2 border-background overflow-hidden">
                  <UserAvatar
                    src={memberAvatars[0]?.profilePicture}
                    username={memberAvatars[0]?.username ?? "?"}
                    size="sm"
                    showOnline={false}
                  />
                </div>
                <div className="absolute top-0 left-0 w-7 h-7 rounded-full border-2 border-background overflow-hidden">
                  <UserAvatar
                    src={memberAvatars[1]?.profilePicture}
                    username={memberAvatars[1]?.username ?? "?"}
                    size="sm"
                    showOnline={false}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{group.name}</p>
            <p className="text-xs text-muted-foreground">
              {typingUsers.length > 0 ? (
                <span className="text-primary font-medium">
                  {typingUsers[0]?.username ?? "Someone"} is typing...
                </span>
              ) : (
                `${group.members.length} member${group.members.length !== 1 ? "s" : ""}`
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {canManage && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAnnouncementModal(true)}
              title="Announcements"
            >
              <Bell size={17} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMediaGallery(true)}
            title="Shared Media"
          >
            <Images size={17} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowInfo(true)}
            className={cn(showInfo && "bg-accent")}
          >
            <Info size={18} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={() => setShowInfo(true)}>
                <Users size={14} className="mr-2" />
                Group Info
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={async () => {
                  await leaveGroup(group.id);
                  toast.success("Left group");
                  onBack?.();
                }}
              >
                <LogOut size={14} className="mr-2" />
                Leave Group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Announcement banner */}
      {announcements.length > 0 && !dismissedAnnouncement && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500/10 border-b border-yellow-500/20">
          <Bell
            size={13}
            className="text-yellow-600 dark:text-yellow-400 flex-shrink-0"
          />
          <p className="text-xs text-yellow-700 dark:text-yellow-300 flex-1 truncate font-medium">
            {announcements[0]}
          </p>
          <button
            type="button"
            onClick={() => setDismissedAnnouncement(true)}
            className="text-yellow-600/60 hover:text-yellow-600 transition-colors"
          >
            <X size={13} />
          </button>
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
          </div>
        </div>
      )}

      {/* Main content: messages + thread panel side by side */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Messages area */}
        <div
          className={cn(
            "flex flex-col flex-1 min-w-0 min-h-0",
            threadParent ? "hidden md:flex" : "flex",
          )}
        >
          <div className="flex-1 overflow-y-auto chat-scroll py-2 chat-messages-bg">
            {groupMsgs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                <div className="w-16 h-16 rounded-2xl group-icon-gradient flex items-center justify-center">
                  <Users size={28} className="text-white" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">{group.name}</p>
                  {group.description && (
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                      {group.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {group.members.length} members · Start the conversation!
                  </p>
                </div>
              </div>
            )}

            {/* Polls for this group */}
            {groupPolls.map((poll) => (
              <div
                key={poll.id}
                className={cn(
                  "flex items-end gap-2 px-4 py-1",
                  poll.createdBy === currentUid
                    ? "flex-row-reverse"
                    : "flex-row",
                )}
              >
                <PollBubble
                  poll={poll}
                  currentUid={currentUid}
                  isSender={poll.createdBy === currentUid}
                />
              </div>
            ))}

            {groupMsgs.map((msg, idx) => {
              const prevMsg = groupMsgs[idx - 1];
              const showDateSep =
                !prevMsg ||
                new Date(msg.createdAt).toDateString() !==
                  new Date(prevMsg.createdAt).toDateString();

              const replyMsg = msg.replyTo
                ? groupMsgs.find((m) => m.id === msg.replyTo)
                : undefined;

              const isLastSent =
                msg.senderId === currentUid && idx === lastSentIdx;
              const participants = group.members
                .map((uid) => users[uid])
                .filter(Boolean);

              // Count thread replies
              const threadCount = groupMsgs.filter(
                (m) => m.replyTo === msg.id,
              ).length;

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
                  {msg.senderId !== currentUid && users[msg.senderId] && (
                    <div className={cn("px-3 mb-0.5", "pl-[52px]")}>
                      <span className="text-[11px] font-semibold text-primary/80">
                        @{users[msg.senderId].username}
                        {groupRoles[msg.senderId] === "admin" && (
                          <Crown
                            size={9}
                            className="inline ml-1 text-yellow-500"
                          />
                        )}
                        {groupRoles[msg.senderId] === "moderator" && (
                          <Shield
                            size={9}
                            className="inline ml-1 text-blue-400"
                          />
                        )}
                      </span>
                    </div>
                  )}
                  <div className="relative">
                    <MessageBubble
                      message={msg}
                      isSender={msg.senderId === currentUid}
                      currentUid={currentUid}
                      senderUser={users[msg.senderId]}
                      replyToMessage={replyMsg}
                      participants={participants}
                      onReact={(emoji) =>
                        reactToMessage(group.id, msg.id, emoji, currentUid)
                      }
                      onReply={() => setThreadParent(msg)}
                      onEdit={
                        msg.senderId === currentUid
                          ? () => {
                              setEditingMessage(msg);
                              setInputText(msg.text);
                              inputRef.current?.focus();
                            }
                          : undefined
                      }
                      onDeleteForMe={() => {}}
                      onDeleteForEveryone={
                        msg.senderId === currentUid || canManage
                          ? () => deleteMessageForEveryone(group.id, msg.id)
                          : undefined
                      }
                      onForward={() => {}}
                      onReport={
                        msg.senderId !== currentUid
                          ? () => setReportingMessage(msg)
                          : undefined
                      }
                      isLastMessage={isLastSent}
                    />
                    {/* Thread indicator */}
                    {threadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setThreadParent(msg)}
                        className={cn(
                          "ml-14 mb-1 flex items-center gap-1 text-[11px] font-medium text-primary hover:underline",
                          msg.senderId === currentUid
                            ? "justify-end mr-4"
                            : "justify-start ml-14",
                        )}
                      >
                        💬 {threadCount} repl{threadCount === 1 ? "y" : "ies"}{" "}
                        in thread
                      </button>
                    )}
                  </div>
                </React.Fragment>
              );
            })}

            {typingUsers.length > 0 && typingUsers[0] && (
              <TypingIndicator user={typingUsers[0]} />
            )}
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
                <X size={14} />
              </Button>
            </div>
          )}

          {/* Input bar */}
          {isRecording ? (
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
              >
                <MicOff size={18} />
              </Button>
              <Button
                size="icon"
                onClick={stopRecording}
                className="bg-destructive hover:bg-destructive/90 w-9 h-9 rounded-xl flex-shrink-0"
              >
                <Square size={14} className="text-white fill-white" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col border-t border-border bg-background">
              {showFormattingBar && (
                <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/50 bg-muted/30">
                  <button
                    type="button"
                    onClick={() => wrapSelectedText("**", "**")}
                    className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors font-bold text-xs"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => wrapSelectedText("_", "_")}
                    className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors italic text-xs"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => wrapSelectedText("~~", "~~")}
                    className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors line-through text-xs"
                  >
                    S
                  </button>
                  <button
                    type="button"
                    onClick={() => wrapSelectedText("`", "`")}
                    className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors font-mono text-xs"
                  >
                    {"</>"}
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2 px-3 py-3 input-bar-mobile">
                <EmojiPicker
                  onEmojiSelect={(e) => setInputText((p) => p + e)}
                />
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Message group..."
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
                  onClick={() => setShowFormattingBar((v) => !v)}
                  className={cn(
                    "text-muted-foreground hover:text-primary flex-shrink-0 h-10 w-10 rounded-xl transition-colors",
                    showFormattingBar && "bg-accent text-foreground",
                  )}
                >
                  <Bold size={16} />
                </Button>
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
                  >
                    <Mic size={20} />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Group Info Dialog */}
          <Dialog open={showInfo} onOpenChange={setShowInfo}>
            <DialogContent className="rounded-2xl max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users size={16} className="text-primary" />
                  {group.name}
                </DialogTitle>
              </DialogHeader>
              {group.description && (
                <p className="text-sm text-muted-foreground">
                  {group.description}
                </p>
              )}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {group.members.length} Members
                </p>
                <ScrollArea className="max-h-60">
                  {group.members.map((uid) => {
                    const member = users[uid];
                    return (
                      <div key={uid} className="flex items-center gap-3 py-2">
                        <UserAvatar
                          src={member?.profilePicture}
                          username={member?.username ?? uid.slice(-6)}
                          size="sm"
                          isOnline={member?.onlineStatus}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            @{member?.username ?? uid.slice(-6)}
                          </p>
                          {uid === group.adminId && (
                            <p className="text-xs text-primary">Admin</p>
                          )}
                          {uid === currentUid && (
                            <p className="text-xs text-muted-foreground">You</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </ScrollArea>
              </div>
              <Button
                variant="destructive"
                className="w-full rounded-xl"
                onClick={async () => {
                  setShowInfo(false);
                  await leaveGroup(group.id);
                  toast.success("Left group");
                  onBack?.();
                }}
              >
                <LogOut size={14} className="mr-2" />
                Leave Group
              </Button>
            </DialogContent>
          </Dialog>

          {/* Poll modal */}
          <PollModal
            open={showPollModal}
            chatId={group.id}
            createdBy={currentUid}
            onClose={() => setShowPollModal(false)}
            onPollCreated={() => {
              setGroupPolls(getPollsForChat(group.id));
              setShowPollModal(false);
            }}
          />

          {/* Media Gallery */}
          <MediaGallery
            open={showMediaGallery}
            messages={groupMsgs}
            onClose={() => setShowMediaGallery(false)}
          />

          {/* Announcement modal */}
          <AnnouncementModal
            open={showAnnouncementModal}
            groupId={group.id}
            isAdmin={canManage}
            onClose={() => {
              setShowAnnouncementModal(false);
              setAnnouncements(getAnnouncements(group.id));
            }}
          />

          {/* Report Modal */}
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
                    {["Spam", "Harassment", "Inappropriate", "Other"].map(
                      (r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 py-2 rounded-xl border border-border text-sm hover:bg-accent transition-colors"
                    onClick={() => setReportingMessage(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-2 rounded-xl gradient-btn text-white text-sm"
                    onClick={() => {
                      if (!reportingMessage) return;
                      const report: Report = {
                        id: `report_${Date.now()}`,
                        messageId: reportingMessage.id,
                        chatId: group.id,
                        reason: reportReason,
                        reportedBy: currentUid,
                        createdAt: Date.now(),
                      };
                      addReport(currentUid, report);
                      setReportingMessage(null);
                      toast.success("Message reported. Thank you.");
                    }}
                  >
                    Submit Report
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {/* end messages area */}

        {/* Thread panel */}
        {threadParent && (
          <div className="w-full md:w-80 flex-shrink-0 border-l border-border">
            <ThreadPanel
              parentMessage={threadParent}
              groupId={group.id}
              users={users}
              allMessages={groupMsgs}
              onClose={() => setThreadParent(null)}
            />
          </div>
        )}
      </div>
      {/* end flex row */}
    </div>
  );
}
