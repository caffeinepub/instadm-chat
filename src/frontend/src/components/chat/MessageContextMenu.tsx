import { cn } from "@/lib/utils";
import {
  Bookmark,
  BookmarkCheck,
  Edit2,
  Flag,
  Pin,
  PinOff,
  Reply,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];

interface MessageContextMenuProps {
  x: number;
  y: number;
  isSender: boolean;
  isOptimistic?: boolean;
  isBookmarked?: boolean;
  isSaved?: boolean;
  isPinned?: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit?: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone?: () => void;
  onForward: () => void;
  onBookmark?: () => void;
  onSave?: () => void;
  onPin?: () => void;
  onReport?: () => void;
  onClose: () => void;
}

export function MessageContextMenu({
  x,
  y,
  isSender,
  isOptimistic = false,
  isBookmarked = false,
  isSaved = false,
  isPinned = false,
  onReact,
  onReply,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onForward,
  onBookmark,
  onSave,
  onPin,
  onReport,
  onClose,
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Clamp position to viewport
  const menuWidth = 200;
  const menuHeight = 340;
  const clampedX = Math.min(x, window.innerWidth - menuWidth - 8);
  const clampedY = Math.min(y, window.innerHeight - menuHeight - 8);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 rounded-2xl overflow-hidden context-menu-enter"
      style={{
        left: clampedX,
        top: clampedY,
        minWidth: menuWidth,
        background: "oklch(var(--popover))",
        border: "1px solid oklch(var(--border))",
        boxShadow:
          "0 4px 24px oklch(0.05 0.01 270 / 0.6), 0 1px 4px oklch(0.05 0.01 270 / 0.3), inset 0 1px 0 oklch(var(--border) / 0.5)",
      }}
    >
      {/* Reactions row */}
      <div
        className="flex items-center gap-0.5 px-2 py-2.5"
        style={{
          borderBottom: "1px solid oklch(var(--border) / 0.6)",
          background: "oklch(var(--card) / 0.5)",
        }}
      >
        {REACTION_EMOJIS.map((emoji) => (
          <button
            type="button"
            key={emoji}
            onClick={() => {
              onReact(emoji);
              onClose();
            }}
            className="text-[22px] hover:scale-130 active:scale-110 transition-transform duration-150 p-1.5 rounded-xl hover:bg-accent/80"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="py-1.5">
        <MenuAction
          icon={<Reply size={14} />}
          label="Reply"
          onClick={() => {
            onReply();
            onClose();
          }}
        />
        {isSender && onEdit && !isOptimistic && (
          <MenuAction
            icon={<Edit2 size={14} />}
            label="Edit"
            onClick={() => {
              onEdit();
              onClose();
            }}
          />
        )}
        {!isOptimistic && (
          <MenuAction
            icon={<Share2 size={14} />}
            label="Forward"
            onClick={() => {
              onForward();
              onClose();
            }}
          />
        )}
        {!isOptimistic && onBookmark && (
          <MenuAction
            icon={<Bookmark size={14} />}
            label={isBookmarked ? "Remove Bookmark" : "Bookmark"}
            onClick={() => {
              onBookmark();
              onClose();
            }}
          />
        )}
        {!isOptimistic && onSave && (
          <MenuAction
            icon={
              isSaved ? (
                <BookmarkCheck size={14} />
              ) : (
                <BookmarkCheck size={14} />
              )
            }
            label={isSaved ? "Unsave" : "Save Message"}
            onClick={() => {
              onSave();
              onClose();
            }}
          />
        )}
        {!isOptimistic && onPin && (
          <MenuAction
            icon={isPinned ? <PinOff size={14} /> : <Pin size={14} />}
            label={isPinned ? "Unpin" : "Pin Message"}
            onClick={() => {
              onPin();
              onClose();
            }}
          />
        )}
        {!isOptimistic && !isSender && onReport && (
          <MenuAction
            icon={<Flag size={14} />}
            label="Report"
            onClick={() => {
              onReport();
              onClose();
            }}
          />
        )}
        <div
          className="mx-3 my-1 h-px"
          style={{ background: "oklch(var(--border) / 0.5)" }}
        />
        {!isOptimistic && (
          <MenuAction
            icon={<Trash2 size={14} />}
            label="Delete for me"
            onClick={() => {
              onDeleteForMe();
              onClose();
            }}
            danger
          />
        )}
        {isSender && onDeleteForEveryone && !isOptimistic && (
          <MenuAction
            icon={<X size={14} />}
            label="Delete for everyone"
            onClick={() => {
              onDeleteForEveryone();
              onClose();
            }}
            danger
          />
        )}
        {isOptimistic && (
          <div className="px-4 py-2.5 text-xs text-muted-foreground italic">
            Sending...
          </div>
        )}
      </div>
    </div>
  );
}

function MenuAction({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium transition-colors mx-0",
        danger
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-accent/80",
      )}
    >
      <span
        className={cn(
          "flex-shrink-0",
          danger ? "text-destructive/80" : "text-muted-foreground",
        )}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}
