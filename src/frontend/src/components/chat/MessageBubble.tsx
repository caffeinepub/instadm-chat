import { cn } from "@/lib/utils";
import { Check, CheckCheck, FileText, Pause, Play } from "lucide-react";
import type React from "react";
import { useCallback, useRef, useState } from "react";
import type { AppUser, Message } from "../../types";
import { MessageContextMenu } from "./MessageContextMenu";

interface MessageBubbleProps {
  message: Message;
  isSender: boolean;
  currentUid: string;
  senderUser?: AppUser;
  replyToMessage?: Message;
  participants: AppUser[];
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit?: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone?: () => void;
  onForward: () => void;
  isLastMessage?: boolean;
}

export function MessageBubble({
  message,
  isSender,
  currentUid,
  replyToMessage,
  participants,
  onReact,
  onReply,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onForward,
  isLastMessage = false,
}: MessageBubbleProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      let x: number;
      let y: number;
      if ("touches" in e) {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
      } else {
        x = (e as React.MouseEvent).clientX;
        y = (e as React.MouseEvent).clientY;
      }
      setContextMenu({ x, y });
    },
    [],
  );

  // Hidden for this user
  if (message.deletedFor.includes(currentUid)) return null;

  const isDeleted = message.deletedForEveryone;
  const hasReactions = Object.keys(message.reactions).length > 0;

  // Message status
  const otherParticipants = participants.filter((p) => p.uid !== currentUid);
  const isSeen = otherParticipants.some((p) => message.seenBy.includes(p.uid));
  const isDelivered = message.seenBy.length > 1;

  // Format time
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <div
        className={cn(
          "flex items-end gap-2 px-4 py-0.5 group msg-enter",
          isSender ? "flex-row-reverse" : "flex-row",
        )}
      >
        {/* Bubble */}
        <div
          className={cn(
            "relative max-w-[70%] md:max-w-[60%]",
            isSender ? "items-end" : "items-start",
          )}
        >
          {/* Reply preview */}
          {replyToMessage && !replyToMessage.deletedForEveryone && (
            <div
              className={cn(
                "mb-1 px-3 py-1.5 rounded-xl text-xs border-l-2 opacity-70 max-w-full truncate",
                isSender
                  ? "bg-white/20 border-white/60 text-white"
                  : "bg-black/10 border-border text-foreground dark:bg-white/10",
              )}
            >
              <span className="font-semibold block text-[10px] mb-0.5 uppercase tracking-wide opacity-80">
                Reply
              </span>
              <span className="truncate block">
                {replyToMessage.text || `📎 ${replyToMessage.messageType}`}
              </span>
            </div>
          )}

          {/* Main bubble */}
          <div
            className={cn(
              "relative cursor-pointer select-none",
              isSender ? "bubble-sender" : "bubble-receiver",
              isDeleted && "opacity-60",
            )}
            onContextMenu={handleContextMenu}
            onDoubleClick={handleContextMenu}
          >
            {isDeleted ? (
              <p className="italic text-sm px-4 py-2.5 opacity-80">
                This message was deleted
              </p>
            ) : (
              <BubbleContent message={message} isSender={isSender} />
            )}
          </div>

          {/* Reactions */}
          {hasReactions && (
            <div
              className={cn(
                "flex flex-wrap gap-1 mt-1",
                isSender ? "justify-end" : "justify-start",
              )}
            >
              {Object.entries(message.reactions).map(([emoji, uids]) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => onReact(emoji)}
                  className={cn(
                    "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs",
                    "bg-accent border border-border hover:scale-105 transition-transform reaction-pop",
                    uids.includes(currentUid) && "ring-1 ring-primary",
                  )}
                >
                  <span>{emoji}</span>
                  {uids.length > 1 && (
                    <span className="text-muted-foreground">{uids.length}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Timestamp + status */}
          <div
            className={cn(
              "flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground",
              isSender ? "justify-end" : "justify-start",
            )}
          >
            <span>{time}</span>
            {message.edited && (
              <span className="italic opacity-70">· Edited</span>
            )}
            {isSender && (
              <span className="flex items-center">
                {isSeen ? (
                  <CheckCheck
                    size={13}
                    className="text-primary"
                    strokeWidth={2.5}
                  />
                ) : isDelivered ? (
                  <CheckCheck
                    size={13}
                    className="text-muted-foreground"
                    strokeWidth={2}
                  />
                ) : (
                  <Check size={13} className="text-muted-foreground" />
                )}
              </span>
            )}
          </div>

          {/* Instagram-style "Seen" label for the last sent message */}
          {isSender && isLastMessage && isSeen && (
            <div className="flex justify-end mt-0.5 seen-indicator">
              <span
                className="text-[9px] font-medium"
                style={{ color: "oklch(var(--primary))" }}
              >
                Seen
              </span>
            </div>
          )}
        </div>
      </div>

      {contextMenu && (
        <MessageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isSender={isSender}
          isOptimistic={message.id.startsWith("optimistic_")}
          onReact={onReact}
          onReply={onReply}
          onEdit={onEdit}
          onDeleteForMe={onDeleteForMe}
          onDeleteForEveryone={isSender ? onDeleteForEveryone : undefined}
          onForward={onForward}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}

// Pre-computed waveform heights (20 bars) to avoid array index key issues
const WAVEFORM_HEIGHTS = Array.from({ length: 20 }, (_, i) =>
  Math.max(4, 4 + Math.sin(i * 1.2) * 5 + Math.cos(i * 0.8) * 3),
);
const WAVEFORM_KEYS = WAVEFORM_HEIGHTS.map((_, i) => `wf-${i}`);

function VoiceMessageContent({
  message,
  isSender,
}: {
  message: Message;
  isSender: boolean;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(message.mediaDuration ?? 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = useCallback(() => {
    if (!message.mediaUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(message.mediaUrl);
      audioRef.current.onloadedmetadata = () => {
        setDuration(audioRef.current?.duration ?? 0);
      };
      audioRef.current.ontimeupdate = () => {
        setCurrentTime(audioRef.current?.currentTime ?? 0);
      };
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [message.mediaUrl, isPlaying]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 min-w-[180px]">
      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
          isSender
            ? "bg-white/25 hover:bg-white/35 text-white"
            : "bg-primary/10 hover:bg-primary/20 text-primary",
        )}
      >
        {isPlaying ? (
          <Pause size={14} className="fill-current" />
        ) : (
          <Play size={14} className="fill-current ml-0.5" />
        )}
      </button>
      {/* Waveform bars */}
      <div className="flex items-center gap-0.5 flex-1">
        {WAVEFORM_HEIGHTS.map((barHeight, i) => {
          const barProgress = i / 20;
          const isActive = barProgress <= progress;
          return (
            <div
              key={WAVEFORM_KEYS[i]}
              className={cn(
                "rounded-full transition-colors w-1",
                isActive
                  ? isSender
                    ? "bg-white/90"
                    : "bg-primary"
                  : isSender
                    ? "bg-white/30"
                    : "bg-muted-foreground/30",
              )}
              style={{ height: `${Math.max(4, barHeight)}px` }}
            />
          );
        })}
      </div>
      <span
        className={cn(
          "text-xs tabular-nums flex-shrink-0",
          isSender ? "text-white/70" : "text-muted-foreground",
        )}
      >
        {isPlaying ? formatTime(currentTime) : formatTime(duration)}
      </span>
    </div>
  );
}

// ─── Markdown-lite formatter ──────────────────────────────────────────────────
function renderFormattedText(text: string): React.ReactNode[] {
  // Split on markdown tokens: **bold**, _italic_, ~~strikethrough~~, `code`
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|_[^_]+_|~~[^~]+~~|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  // biome-ignore lint/suspicious/noAssignInExpressions: intentional regex loop
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`txt-${keyIdx++}`}>
          {text.slice(lastIndex, match.index)}
        </span>,
      );
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={`bold-${keyIdx++}`}>{token.slice(2, -2)}</strong>,
      );
    } else if (token.startsWith("_") && token.endsWith("_")) {
      parts.push(<em key={`em-${keyIdx++}`}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("~~") && token.endsWith("~~")) {
      parts.push(<del key={`del-${keyIdx++}`}>{token.slice(2, -2)}</del>);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={`code-${keyIdx++}`}
          className="bg-black/15 rounded px-1 py-0.5 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    parts.push(
      <span key={`txt-end-${keyIdx++}`}>{text.slice(lastIndex)}</span>,
    );
  }
  return parts.length > 0 ? parts : [<span key="raw">{text}</span>];
}

function BubbleContent({
  message,
  isSender,
}: {
  message: Message;
  isSender: boolean;
}) {
  switch (message.messageType) {
    case "image":
      return (
        <div className="p-1">
          <img
            src={message.mediaUrl}
            alt={message.text || "Media content"}
            className="rounded-[14px] max-w-full max-h-60 object-cover"
            loading="lazy"
          />
          {message.text && (
            <p className="px-2 pb-2 pt-1 text-sm">{message.text}</p>
          )}
        </div>
      );

    case "video":
      return (
        <div className="relative p-1">
          {message.mediaUrl ? (
            // biome-ignore lint/a11y/useMediaCaption: chat video messages don't require captions
            <video
              src={message.mediaUrl}
              className="rounded-[14px] max-w-full max-h-60 object-cover"
              controls
            />
          ) : (
            <div className="rounded-[14px] bg-black/30 flex items-center justify-center w-48 h-32">
              <Play size={32} className="text-white/80" />
            </div>
          )}
          {message.text && (
            <p className="px-2 pb-2 pt-1 text-xs opacity-70">{message.text}</p>
          )}
        </div>
      );

    case "voice":
      return <VoiceMessageContent message={message} isSender={isSender} />;

    case "file":
      return (
        <div className="flex items-center gap-3 px-4 py-3">
          <div
            className={cn(
              "p-2 rounded-lg",
              isSender ? "bg-white/20" : "bg-primary/10",
            )}
          >
            <FileText
              size={20}
              className={isSender ? "text-white" : "text-primary"}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {message.mediaName ?? "File"}
            </p>
            <p className="text-xs opacity-60">File</p>
          </div>
        </div>
      );

    default:
      return (
        <p className="px-4 py-2.5 text-sm leading-relaxed">
          {renderFormattedText(message.text)}
        </p>
      );
  }
}
