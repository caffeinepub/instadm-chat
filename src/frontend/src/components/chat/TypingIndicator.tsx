import type { AppUser } from "../../types";
import { UserAvatar } from "./UserAvatar";

interface TypingIndicatorProps {
  user?: AppUser;
}

export function TypingIndicator({ user }: TypingIndicatorProps) {
  return (
    <div className="flex items-end gap-2 py-1 px-4 typing-slide-in">
      {/* Avatar */}
      {user && (
        <UserAvatar
          src={user.profilePicture}
          username={user.username}
          size="sm"
          showOnline={false}
        />
      )}

      <div className="flex flex-col gap-0.5">
        {/* "is typing..." label */}
        {user && (
          <span className="text-[10px] text-muted-foreground px-1 font-medium">
            {user.username} is typing
          </span>
        )}

        {/* Animated dots bubble */}
        <div className="bubble-receiver px-4 py-3 flex gap-1.5 items-center min-w-[60px]">
          <span
            className="typing-dot w-2 h-2 rounded-full inline-block"
            style={{ background: "oklch(var(--muted-foreground))" }}
          />
          <span
            className="typing-dot w-2 h-2 rounded-full inline-block"
            style={{ background: "oklch(var(--muted-foreground))" }}
          />
          <span
            className="typing-dot w-2 h-2 rounded-full inline-block"
            style={{ background: "oklch(var(--muted-foreground))" }}
          />
        </div>
      </div>
    </div>
  );
}
