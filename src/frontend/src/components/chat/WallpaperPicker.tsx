import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Wallpaper } from "lucide-react";
import { useState } from "react";
import {
  WALLPAPER_OPTIONS,
  getChatWallpaper,
  setChatWallpaper,
} from "../../services/featureService";

interface WallpaperPickerProps {
  chatId: string;
  onSelect?: (value: string) => void;
}

export function WallpaperPicker({ chatId, onSelect }: WallpaperPickerProps) {
  const [selected, setSelected] = useState(() => getChatWallpaper(chatId));
  const [open, setOpen] = useState(false);

  const handleSelect = (value: string) => {
    setSelected(value);
    setChatWallpaper(chatId, value);
    onSelect?.(value);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent/80 transition-colors"
        >
          <Wallpaper
            size={14}
            className="text-muted-foreground flex-shrink-0"
          />
          Chat Wallpaper
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 rounded-2xl p-3" side="left">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Choose Wallpaper
        </p>
        <div className="grid grid-cols-6 gap-2">
          {WALLPAPER_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.id}
              title={opt.label}
              onClick={() => handleSelect(opt.value)}
              className={`wallpaper-swatch border ${
                selected === opt.value
                  ? "selected"
                  : "border-border hover:border-primary/40"
              }`}
              style={{
                background:
                  opt.value ||
                  "conic-gradient(from 0deg, #f0f0f0 0%, #d0d0d0 50%, #f0f0f0 100%)",
              }}
            >
              {opt.id === "none" && (
                <span className="text-[10px] text-muted-foreground">✕</span>
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
