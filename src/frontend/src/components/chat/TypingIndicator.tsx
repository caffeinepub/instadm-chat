import type { AppUser } from "../../types";
import { UserAvatar } from "./UserAvatar";

interface TypingIndicatorProps {
  user?: AppUser;
}

export function TypingIndicator({ user }: TypingIndicatorProps) {
  return (
    <div className="flex items-end gap-2 py-1.5 px-4 typing-slide-in">
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
          <span className="text-[10px] text-muted-foreground px-1 font-medium tracking-wide">
            {user.username} is typing
          </span>
        )}

        {/* Animated dots bubble */}
        <div className="bubble-receiver px-4 py-3 flex gap-1.5 items-center min-w-[64px]">
          <span className="typing-dot w-2 h-2 rounded-full inline-block bg-muted-foreground/60" />
          <span className="typing-dot w-2 h-2 rounded-full inline-block bg-muted-foreground/60" />
          <span className="typing-dot w-2 h-2 rounded-full inline-block bg-muted-foreground/60" />
        </div>
      </div>
    </div>
  );
}
