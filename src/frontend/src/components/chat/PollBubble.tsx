import { cn } from "@/lib/utils";
import { BarChart2, CheckCircle2, EyeOff } from "lucide-react";
import type { Poll } from "../../services/featureService";

interface PollBubbleProps {
  poll: Poll;
  currentUid: string;
  isSender: boolean;
  /** Called when the user casts or changes their vote. Parent is responsible for
   *  persisting the vote and re-rendering with updated `poll.votes`. */
  onVote?: (pollId: string, optionIndex: number) => void;
}

export function PollBubble({
  poll,
  currentUid,
  isSender,
  onVote,
}: PollBubbleProps) {
  const totalVotes = Object.keys(poll.votes).length;
  const userVote = poll.votes[currentUid];
  // For anonymous polls, hide vote counts from non-creators
  const showVoteCounts = !poll.isAnonymous || poll.createdBy === currentUid;

  const handleVote = (optionIndex: number) => {
    onVote?.(poll.id, optionIndex);
  };

  const getVoteCount = (optionIndex: number) => {
    return Object.values(poll.votes).filter((v) => v === optionIndex).length;
  };

  const getVotePercent = (optionIndex: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((getVoteCount(optionIndex) / totalVotes) * 100);
  };

  return (
    <div
      className={cn(
        "rounded-[18px] overflow-hidden min-w-[220px] max-w-[280px]",
        isSender
          ? "bg-gradient-to-br from-primary to-secondary"
          : "bg-card border border-border",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2.5 border-b",
          isSender ? "border-white/20" : "border-border",
        )}
      >
        <BarChart2
          size={14}
          className={isSender ? "text-white/80" : "text-primary"}
        />
        <span
          className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            isSender ? "text-white/80" : "text-muted-foreground",
          )}
        >
          Poll
        </span>
        {poll.isAnonymous && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full",
              isSender
                ? "bg-white/15 text-white/70"
                : "bg-muted text-muted-foreground",
            )}
          >
            <EyeOff size={9} />
            anon
          </span>
        )}
        <span
          className={cn(
            "ml-auto text-[10px]",
            isSender ? "text-white/60" : "text-muted-foreground",
          )}
        >
          {poll.isAnonymous
            ? "? votes"
            : `${totalVotes} vote${totalVotes !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Question */}
      <div className={cn("px-3 pt-2.5 pb-1")}>
        <p
          className={cn(
            "text-sm font-semibold leading-snug",
            isSender ? "text-white" : "text-foreground",
          )}
        >
          {poll.question}
        </p>
      </div>

      {/* Options */}
      <div className="px-3 pb-3 space-y-1.5 mt-1">
        {poll.options.map((option, i) => {
          const isVoted = userVote === i;
          const votePercent = getVotePercent(i);
          const _voteCount = getVoteCount(i);

          return (
            <button
              type="button"
              key={`poll-option-${poll.id}-${i}`}
              onClick={() => handleVote(i)}
              className={cn(
                "w-full relative rounded-xl overflow-hidden text-left transition-all",
                "hover:scale-[1.01] active:scale-[0.99]",
                isVoted
                  ? isSender
                    ? "ring-2 ring-white/60"
                    : "ring-2 ring-primary"
                  : "",
              )}
            >
              {/* Background bar */}
              <div
                className={cn(
                  "absolute inset-0 transition-all duration-500",
                  isSender ? "bg-white/20" : "bg-primary/10",
                )}
                style={{ width: `${votePercent}%` }}
              />

              {/* Content */}
              <div className="relative flex items-center gap-2 px-3 py-2">
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                    isVoted
                      ? isSender
                        ? "border-white bg-white"
                        : "border-primary bg-primary"
                      : isSender
                        ? "border-white/50"
                        : "border-border",
                  )}
                >
                  {isVoted && (
                    <CheckCircle2
                      size={10}
                      className={
                        isSender ? "text-primary" : "text-primary-foreground"
                      }
                    />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium flex-1 truncate",
                    isSender ? "text-white" : "text-foreground",
                  )}
                >
                  {option}
                </span>
                {showVoteCounts && (
                  <span
                    className={cn(
                      "text-[10px] font-semibold flex-shrink-0",
                      isSender ? "text-white/70" : "text-muted-foreground",
                    )}
                  >
                    {votePercent}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
