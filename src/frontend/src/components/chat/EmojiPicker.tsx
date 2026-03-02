import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Smile } from "lucide-react";
import React from "react";
import { getCustomReactions } from "../../services/featureService";

const EMOJIS = [
  "😀",
  "😂",
  "😍",
  "🥰",
  "😎",
  "🤩",
  "😢",
  "😡",
  "🤔",
  "👋",
  "👍",
  "👎",
  "❤️",
  "🔥",
  "✨",
  "🎉",
  "🙏",
  "💯",
  "🤣",
  "😊",
  "😭",
  "😤",
  "🥺",
  "🤯",
  "🙈",
  "💪",
  "🎶",
  "🌟",
  "💔",
  "👏",
  "🥳",
  "😏",
  "🤦",
  "🙄",
  "😷",
  "🤗",
  "😬",
  "🥲",
  "😇",
  "🤪",
];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  currentUid?: string;
  /** When true, renders a compact grid icon instead of a full button */
  compact?: boolean;
}

export function EmojiPicker({
  onEmojiSelect,
  currentUid,
  compact,
}: EmojiPickerProps) {
  const customReactions = currentUid ? getCustomReactions(currentUid) : [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        {compact ? (
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-yellow-500/15 flex items-center justify-center hover:bg-yellow-500/25 transition-colors"
            title="Emoji"
          >
            <Smile size={17} className="text-yellow-500" />
          </button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
          >
            <Smile size={22} />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-2 rounded-2xl shadow-xl"
        side="top"
        align="start"
        sideOffset={8}
      >
        {customReactions.length > 0 && (
          <div className="mb-2 pb-2 border-b border-border/50">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
              Custom
            </p>
            <div className="flex flex-wrap gap-0.5">
              {customReactions.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => onEmojiSelect(emoji)}
                  className="text-xl p-1.5 rounded-lg hover:bg-accent transition-colors hover:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJIS.map((emoji) => (
            <button
              type="button"
              key={emoji}
              onClick={() => onEmojiSelect(emoji)}
              className="text-xl p-1.5 rounded-lg hover:bg-accent transition-colors hover:scale-110"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
