import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Smile } from "lucide-react";
import React from "react";

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
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
        >
          <Smile size={22} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-2 rounded-2xl shadow-xl"
        side="top"
        align="start"
        sideOffset={8}
      >
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
