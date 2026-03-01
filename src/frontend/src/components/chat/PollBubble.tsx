import { cn } from "@/lib/utils";
import { BarChart2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { type Poll, votePoll } from "../../services/featureService";

interface PollBubbleProps {
  poll: Poll;
  currentUid: string;
  isSender: boolean;
}

export function PollBubble({ poll, currentUid, isSender }: PollBubbleProps) {
  const [currentPoll, setCurrentPoll] = useState(poll);

  const totalVotes = Object.keys(currentPoll.votes).length;
  const userVote = currentPoll.votes[currentUid];

  const handleVote = (optionIndex: number) => {
    const updated = votePoll(currentPoll.id, currentUid, optionIndex);
    const updatedPoll = updated[currentPoll.id];
    if (updatedPoll) {
      setCurrentPoll(updatedPoll);
    }
  };

  const getVoteCount = (optionIndex: number) => {
    return Object.values(currentPoll.votes).filter((v) => v === optionIndex)
      .length;
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
        <span
          className={cn(
            "ml-auto text-[10px]",
            isSender ? "text-white/60" : "text-muted-foreground",
          )}
        >
          {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
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
          {currentPoll.question}
        </p>
      </div>

      {/* Options */}
      <div className="px-3 pb-3 space-y-1.5 mt-1">
        {currentPoll.options.map((option, i) => {
          const isVoted = userVote === i;
          const votePercent = getVotePercent(i);
          const _voteCount = getVoteCount(i);

          return (
            <button
              type="button"
              key={`poll-option-${currentPoll.id}-${i}`}
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
                <span
                  className={cn(
                    "text-[10px] font-semibold flex-shrink-0",
                    isSender ? "text-white/70" : "text-muted-foreground",
                  )}
                >
                  {votePercent}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
