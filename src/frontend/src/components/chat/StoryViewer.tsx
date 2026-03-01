import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Story, markStoryViewed } from "../../services/featureService";

const STORY_DURATION = 5000; // 5 seconds per story

interface StoryViewerProps {
  stories: Story[];
  initialIndex?: number;
  currentUid: string;
  onClose: () => void;
}

export function StoryViewer({
  stories,
  initialIndex = 0,
  currentUid,
  onClose,
}: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const currentStory = stories[currentIndex];

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

  // Mark viewed on change
  useEffect(() => {
    if (currentStory) {
      markStoryViewed(currentStory.id, currentUid);
    }
  }, [currentStory, currentUid]);

  // Auto-advance progress
  // biome-ignore lint/correctness/useExhaustiveDependencies: currentIndex triggers reset intentionally
  useEffect(() => {
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
  }, [currentIndex, goNext]);

  // Keyboard navigation
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
    const diff = Date.now() - currentStory.createdAt;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${hours}h ago`;
  })();

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center story-viewer-enter">
      {/* Story card */}
      <div
        className="relative w-full max-w-sm h-[600px] sm:h-[70vh] rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: currentStory.bgColor || "oklch(0.62 0.27 345)" }}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-3">
          {stories.map((_, i) => (
            <div
              key={`progress-${stories[i].id}`}
              className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white rounded-full"
                style={{
                  width:
                    i < currentIndex
                      ? "100%"
                      : i === currentIndex
                        ? `${progress}%`
                        : "0%",
                  transition: i === currentIndex ? "none" : "width 0.1s ease",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-0 right-0 z-10 flex items-center gap-3 px-4">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
            {currentStory.authorUsername.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold">
              @{currentStory.authorUsername}
            </p>
            <p className="text-white/60 text-[10px]">{timeAgo}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Story content */}
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <p className="text-white text-xl font-bold text-center leading-snug drop-shadow-lg">
            {currentStory.text}
          </p>
        </div>

        {/* Tap zones */}
        <button
          type="button"
          className="absolute left-0 top-0 w-1/3 h-full z-20 bg-transparent"
          onClick={goPrev}
          aria-label="Previous story"
        />
        <button
          type="button"
          className="absolute right-0 top-0 w-1/3 h-full z-20 bg-transparent"
          onClick={goNext}
          aria-label="Next story"
        />
      </div>

      {/* Background click to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Enter" && onClose()}
        role="button"
        tabIndex={-1}
        aria-label="Close story"
      />
    </div>
  );
}
