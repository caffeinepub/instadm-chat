import {
  BookmarkPlus,
  Eye,
  Heart,
  MoreHorizontal,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Story } from "../../backend.d";

const STORY_DURATION = 5000;
const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "👏", "🔥"];

interface GroupedStories {
  authorId: string;
  authorUsername: string;
  stories: Story[];
  allViewed: boolean;
}

interface StoryViewerICPProps {
  group: GroupedStories;
  currentUid: string;
  onClose: () => void;
  onDelete?: (storyId: string) => void;
  onReact?: (storyId: string, emoji: string) => void;
  onAddHighlight?: (storyId: string, title: string) => void;
}

export function StoryViewerICP({
  group,
  currentUid,
  onClose,
  onDelete,
  onReact,
  onAddHighlight,
}: StoryViewerICPProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showViews, setShowViews] = useState(false);
  const [showHighlightInput, setShowHighlightInput] = useState(false);
  const [highlightTitle, setHighlightTitle] = useState("");
  const [showReactions, setShowReactions] = useState(false);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const { stories } = group;
  const currentStory = stories[currentIndex];
  const isOwn = group.authorId === currentUid;

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((i) => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: currentIndex reset intentional
  useEffect(() => {
    if (showMenu || showViews || showHighlightInput || showReactions) return;
    setProgress(0);
    startTimeRef.current = Date.now();

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        if (progressRef.current) clearInterval(progressRef.current);
        goNext();
      }
    }, 50);

    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [
    currentIndex,
    goNext,
    showMenu,
    showViews,
    showHighlightInput,
    showReactions,
  ]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, goNext, goPrev]);

  if (!currentStory) return null;

  const timeAgo = (() => {
    const ts =
      typeof currentStory.createdAt === "bigint"
        ? Number(currentStory.createdAt / 1_000_000n)
        : currentStory.createdAt;
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${hours}h ago`;
  })();

  const expiresIn = (() => {
    const expiresMs = Number(currentStory.expiresAt / 1_000_000n);
    const remaining = expiresMs - Date.now();
    if (remaining <= 0) return "Expired";
    const hours = Math.floor(remaining / 3600000);
    if (hours > 0) return `${hours}h left`;
    const mins = Math.floor(remaining / 60000);
    return `${mins}m left`;
  })();

  const viewCount = currentStory.views.length;

  const getBg = () => {
    if (currentStory.mediaUrl) return "#000";
    return (
      currentStory.bgColor ||
      "linear-gradient(135deg,oklch(0.62 0.27 345),oklch(0.58 0.25 310))"
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      {/* Story card */}
      <div
        className="relative w-full max-w-[360px] h-[640px] sm:h-[80vh] rounded-3xl overflow-hidden shadow-2xl story-viewer-enter"
        style={{ background: getBg() }}
      >
        {/* Media background */}
        {currentStory.mediaUrl && (
          <img
            src={currentStory.mediaUrl}
            alt="Story"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />

        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-3 pt-4">
          {stories.map((s, i) => (
            <div
              key={s.id}
              className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width:
                    i < currentIndex
                      ? "100%"
                      : i === currentIndex
                        ? `${progress}%`
                        : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-7 left-0 right-0 z-10 flex items-center gap-3 px-4">
          <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-sm overflow-hidden ring-2 ring-white/40">
            {group.authorUsername.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold drop-shadow">
              @{group.authorUsername}
            </p>
            <p className="text-white/70 text-[10px]">
              {timeAgo} · {expiresIn}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-colors"
            data-ocid="story.viewer.menu.button"
          >
            <MoreHorizontal size={15} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-colors"
            data-ocid="story.viewer.close_button"
          >
            <X size={15} />
          </button>
        </div>

        {/* Context menu */}
        {showMenu && (
          <div className="absolute top-16 right-4 z-30 bg-card/95 backdrop-blur-sm border border-border rounded-2xl py-1 shadow-xl min-w-[160px]">
            {isOwn && (
              <>
                <button
                  type="button"
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                  onClick={() => {
                    setShowViews(true);
                    setShowMenu(false);
                  }}
                  data-ocid="story.viewer.views.button"
                >
                  <Eye size={14} className="text-muted-foreground" />
                  Views ({viewCount})
                </button>
                <button
                  type="button"
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                  onClick={() => {
                    setShowHighlightInput(true);
                    setShowMenu(false);
                  }}
                  data-ocid="story.viewer.highlight.button"
                >
                  <BookmarkPlus size={14} className="text-muted-foreground" />
                  Add to Highlights
                </button>
                <div className="my-1 border-t border-border" />
                <button
                  type="button"
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={() => {
                    onDelete?.(currentStory.id);
                    setShowMenu(false);
                  }}
                  data-ocid="story.viewer.delete_button"
                >
                  <Trash2 size={14} />
                  Delete Story
                </button>
              </>
            )}
            {!isOwn && (
              <button
                type="button"
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                onClick={() => setShowMenu(false)}
              >
                Report Story
              </button>
            )}
          </div>
        )}

        {/* Story content text */}
        {currentStory.text && (
          <div className="absolute inset-0 flex items-center justify-center p-10 pointer-events-none">
            <p className="text-white text-xl font-bold text-center leading-snug drop-shadow-lg">
              {currentStory.text}
            </p>
          </div>
        )}

        {/* Tap zones */}
        <button
          type="button"
          className="absolute left-0 top-16 w-1/3 h-[calc(100%-140px)] z-20 bg-transparent"
          onClick={goPrev}
          aria-label="Previous story"
        />
        <button
          type="button"
          className="absolute right-0 top-16 w-1/3 h-[calc(100%-140px)] z-20 bg-transparent"
          onClick={goNext}
          aria-label="Next story"
        />

        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-4 flex items-center gap-3">
          {!isOwn && (
            <>
              <button
                type="button"
                onClick={() => setShowReactions(!showReactions)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 backdrop-blur-sm text-white text-xs font-medium hover:bg-white/25 transition-colors"
                data-ocid="story.viewer.react.button"
              >
                <Heart size={14} />
                React
              </button>
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 backdrop-blur-sm text-white text-xs font-medium hover:bg-white/25 transition-colors"
                data-ocid="story.viewer.reply.button"
              >
                <Send size={14} />
                Reply
              </button>
            </>
          )}
          {isOwn && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 backdrop-blur-sm text-white text-xs">
              <Eye size={13} />
              <span>{viewCount} views</span>
            </div>
          )}
        </div>

        {/* Reactions row */}
        {showReactions && !isOwn && (
          <div className="absolute bottom-16 left-0 right-0 z-20 flex justify-center gap-3 px-4">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact?.(currentStory.id, emoji);
                  setShowReactions(false);
                }}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl hover:scale-110 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Views modal */}
      {showViews && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-end justify-center">
          <div className="w-full max-w-[360px] bg-card rounded-t-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base">Story Views ({viewCount})</h3>
              <button
                type="button"
                onClick={() => setShowViews(false)}
                className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>
            {currentStory.views.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No views yet
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {currentStory.views.map((v) => (
                  <div
                    key={v.toString()}
                    className="flex items-center gap-3 py-1"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {v.toString().slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {v.toString().slice(0, 12)}…
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Highlight input */}
      {showHighlightInput && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-card rounded-3xl p-5 space-y-4">
            <h3 className="font-bold text-base">Add to Highlights</h3>
            <input
              type="text"
              value={highlightTitle}
              onChange={(e) => setHighlightTitle(e.target.value)}
              placeholder="Highlight title..."
              className="w-full rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
              data-ocid="story.highlight.input"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowHighlightInput(false)}
                className="flex-1 py-2 rounded-xl border border-border text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddHighlight?.(
                    currentStory.id,
                    highlightTitle || "Highlights",
                  );
                  setShowHighlightInput(false);
                  setHighlightTitle("");
                }}
                className="flex-1 py-2 rounded-xl gradient-btn text-white text-sm font-semibold"
                data-ocid="story.highlight.submit_button"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Background click to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Enter" && onClose()}
        role="button"
        tabIndex={-1}
        aria-label="Close story viewer"
      />
    </div>
  );
}
