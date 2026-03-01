import { cn } from "@/lib/utils";
import { Edit2, Reply, Share2, Trash2, X } from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];

interface MessageContextMenuProps {
  x: number;
  y: number;
  isSender: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit?: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone?: () => void;
  onForward: () => void;
  onClose: () => void;
}

export function MessageContextMenu({
  x,
  y,
  isSender,
  onReact,
  onReply,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onForward,
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
  const menuHeight = 280;
  const clampedX = Math.min(x, window.innerWidth - menuWidth - 8);
  const clampedY = Math.min(y, window.innerHeight - menuHeight - 8);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-popover border border-border rounded-2xl shadow-xl overflow-hidden context-menu-enter"
      style={{ left: clampedX, top: clampedY, minWidth: menuWidth }}
    >
      {/* Reactions */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            type="button"
            key={emoji}
            onClick={() => {
              onReact(emoji);
              onClose();
            }}
            className="text-xl hover:scale-125 transition-transform p-1 rounded-full hover:bg-accent"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="py-1">
        <MenuAction
          icon={<Reply size={15} />}
          label="Reply"
          onClick={() => {
            onReply();
            onClose();
          }}
        />
        {isSender && onEdit && (
          <MenuAction
            icon={<Edit2 size={15} />}
            label="Edit"
            onClick={() => {
              onEdit();
              onClose();
            }}
          />
        )}
        <MenuAction
          icon={<Share2 size={15} />}
          label="Forward"
          onClick={() => {
            onForward();
            onClose();
          }}
        />
        <MenuAction
          icon={<Trash2 size={15} />}
          label="Delete for me"
          onClick={() => {
            onDeleteForMe();
            onClose();
          }}
          danger
        />
        {isSender && onDeleteForEveryone && (
          <MenuAction
            icon={<X size={15} />}
            label="Delete for everyone"
            onClick={() => {
              onDeleteForEveryone();
              onClose();
            }}
            danger
          />
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
        "flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium transition-colors",
        danger
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-accent",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
