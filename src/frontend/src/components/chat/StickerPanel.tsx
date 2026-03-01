import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Smile } from "lucide-react";

const STICKER_CATEGORIES = {
  Animals: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼"],
  Food: ["🍕", "🍔", "🌮", "🍜", "🍣", "🍩", "🎂", "🧁"],
  Emotions: ["😍", "🥺", "😂", "🤩", "🥳", "😎", "🤔", "😤"],
};

export const STICKER_PREFIX = "[sticker]";

interface StickerPanelProps {
  onStickerSelect: (sticker: string) => void;
  className?: string;
}

export function StickerPanel({
  onStickerSelect,
  className,
}: StickerPanelProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "text-muted-foreground hover:text-primary flex-shrink-0 h-10 w-10 rounded-xl transition-colors",
            className,
          )}
          title="Stickers"
        >
          <Smile size={18} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-72 rounded-2xl p-2">
        <Tabs defaultValue="Animals">
          <TabsList className="w-full h-8 mb-2 bg-muted/60 rounded-xl">
            {Object.keys(STICKER_CATEGORIES).map((cat) => (
              <TabsTrigger
                key={cat}
                value={cat}
                className="text-xs flex-1 rounded-lg"
              >
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.entries(STICKER_CATEGORIES).map(([cat, stickers]) => (
            <TabsContent key={cat} value={cat} className="mt-0">
              <div className="grid grid-cols-4 gap-1">
                {stickers.map((sticker) => (
                  <button
                    key={sticker}
                    type="button"
                    onClick={() =>
                      onStickerSelect(`${STICKER_PREFIX}${sticker}`)
                    }
                    className="text-3xl p-2 rounded-xl hover:bg-accent transition-colors hover:scale-110"
                    title={sticker}
                  >
                    {sticker}
                  </button>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
