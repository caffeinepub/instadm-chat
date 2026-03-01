import { cn } from "@/lib/utils";
import React from "react";

interface UserAvatarProps {
  src?: string;
  username: string;
  isOnline?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showOnline?: boolean;
}

const sizeMap = {
  xs: { avatar: "w-6 h-6", dot: "w-2 h-2", text: "text-[9px]" },
  sm: { avatar: "w-8 h-8", dot: "w-2.5 h-2.5", text: "text-xs" },
  md: { avatar: "w-10 h-10", dot: "w-3 h-3", text: "text-sm" },
  lg: { avatar: "w-14 h-14", dot: "w-3.5 h-3.5", text: "text-base" },
  xl: { avatar: "w-20 h-20", dot: "w-4 h-4", text: "text-xl" },
};

// Generate a rich, unique gradient per username using hue derived from char codes
function getUserGradient(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 50) % 360;
  // Use vivid oklch colors with high chroma for strong, readable gradients
  return `linear-gradient(135deg, oklch(0.52 0.22 ${hue1}), oklch(0.45 0.25 ${hue2}))`;
}

export function UserAvatar({
  src,
  username,
  isOnline,
  size = "md",
  className,
  showOnline = true,
}: UserAvatarProps) {
  const { avatar, dot, text } = sizeMap[size];
  const initials = username.slice(0, 2).toUpperCase();
  const gradient = getUserGradient(username);

  return (
    <div className={cn("relative inline-block flex-shrink-0", className)}>
      <div
        className={cn(
          "rounded-full overflow-hidden flex items-center justify-center ring-2 ring-background",
          avatar,
        )}
        style={src ? undefined : { background: gradient }}
      >
        {src ? (
          <img
            src={src}
            alt={username}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span
            className={cn(
              "font-bold text-white select-none leading-none",
              text,
            )}
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
          >
            {initials}
          </span>
        )}
      </div>
      {showOnline && isOnline && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full bg-online-dot border-2 border-background online-pulse",
            dot,
          )}
        />
      )}
    </div>
  );
}
