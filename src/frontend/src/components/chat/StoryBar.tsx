import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useActor } from "../../hooks/useActor";
import {
  buildBioWithPayload,
  decodeStoriesFromBio,
  extractPlainBio,
  mergeAllStories,
} from "../../services/bioStorageService";
import {
  type Story,
  createStory,
  getActiveStories,
  getPosts,
  hasViewedStory,
} from "../../services/featureService";
import { StoryViewer } from "./StoryViewer";
import { UserAvatar } from "./UserAvatar";

const STORY_BG_COLORS = [
  "linear-gradient(135deg, oklch(0.62 0.27 345), oklch(0.58 0.25 310))",
  "linear-gradient(135deg, oklch(0.60 0.23 250), oklch(0.58 0.25 290))",
  "linear-gradient(135deg, oklch(0.65 0.22 145), oklch(0.60 0.18 180))",
  "linear-gradient(135deg, oklch(0.65 0.22 50), oklch(0.62 0.24 30))",
  "linear-gradient(135deg, oklch(0.60 0.24 27), oklch(0.58 0.22 10))",
  "linear-gradient(135deg, oklch(0.55 0.25 290), oklch(0.55 0.25 270))",
  "linear-gradient(135deg, oklch(0.65 0.18 200), oklch(0.60 0.18 180))",
  "linear-gradient(135deg, oklch(0.85 0.15 80), oklch(0.82 0.14 60))",
];

interface StoryBarProps {
  className?: string;
}

export function StoryBar({ className }: StoryBarProps) {
  const { currentUser } = useAuth();
  const { actor } = useActor();
  const uid = currentUser!.uid;

  const [stories, setStories] = useState<Story[]>(() => getActiveStories());
  const [viewingStories, setViewingStories] = useState<Story[] | null>(null);
  const [viewingIdx, setViewingIdx] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [newText, setNewText] = useState("");
  const [selectedBg, setSelectedBg] = useState(STORY_BG_COLORS[0]);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Group stories by author
  const storiesByAuthor: Map<string, Story[]> = new Map();
  for (const story of stories) {
    if (!storiesByAuthor.has(story.authorId)) {
      storiesByAuthor.set(story.authorId, []);
    }
    storiesByAuthor.get(story.authorId)!.push(story);
  }

  const myStories = storiesByAuthor.get(uid) ?? [];
  const otherAuthors = [...storiesByAuthor.keys()].filter((id) => id !== uid);

  // ─── Load global stories from ALL users via ICP ─────────────────────────────
  const loadGlobalStories = useCallback(
    async (_silent = false) => {
      try {
        const localStories = getActiveStories();

        if (actor) {
          const allUsers = await actor.searchUsersByUsername("");
          const storiesPerUser: Story[][] = [localStories];

          for (const profile of allUsers) {
            const profileUid = profile._id?.toString();
            if (!profileUid || profileUid === uid) continue;
            const rawBio = profile.bio ?? "";
            const userStories = decodeStoriesFromBio(rawBio);
            if (userStories.length > 0) {
              storiesPerUser.push(userStories);
            }
          }

          const merged = mergeAllStories(storiesPerUser);
          setStories(merged);
        } else {
          setStories(localStories);
        }
      } catch {
        setStories(getActiveStories());
      }
    },
    [actor, uid],
  );

  useEffect(() => {
    loadGlobalStories(false);

    refreshTimerRef.current = setInterval(() => {
      loadGlobalStories(true);
    }, 10000);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [loadGlobalStories]);

  // BroadcastChannel for same-browser story sync
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("linkr_story_updates");
    channel.onmessage = () => {
      loadGlobalStories(true);
    };
    return () => channel.close();
  }, [loadGlobalStories]);

  const refresh = useCallback(() => {
    loadGlobalStories(true);
  }, [loadGlobalStories]);

  const saveStoriesToBio = useCallback(async () => {
    if (!actor || !currentUser) return;
    try {
      const callerProfile = await actor.getCallerUserProfile();
      if (!callerProfile) return;

      const plainBio = extractPlainBio(callerProfile.bio ?? "");
      const myActiveStories = getActiveStories().filter(
        (s) => s.authorId === uid,
      );
      const myPosts = getPosts().filter((p) => p.authorId === uid);
      const newBio = buildBioWithPayload(plainBio, myPosts, myActiveStories);

      await actor.saveCallerUserProfile({
        ...callerProfile,
        bio: newBio,
      });
    } catch {
      // Non-fatal
    }
  }, [actor, currentUser, uid]);

  const handleCreate = () => {
    if (!newText.trim()) return;
    createStory({
      authorId: uid,
      authorUsername: currentUser!.username,
      authorAvatar: currentUser!.profilePicture ?? "",
      text: newText.trim(),
      bgColor: selectedBg,
      createdAt: Date.now(),
    });
    setNewText("");
    setShowCreate(false);
    refresh();

    // Save to ICP bio for cross-device visibility
    saveStoriesToBio();

    // Broadcast to other tabs
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("linkr_story_updates");
      channel.postMessage({ type: "new_story" });
      channel.close();
    }
  };

  const openStories = (authorId: string) => {
    const authorStories = storiesByAuthor.get(authorId) ?? [];
    setViewingStories(authorStories);
    setViewingIdx(0);
  };

  const isAllViewed = (authorId: string) =>
    (storiesByAuthor.get(authorId) ?? []).every((s) =>
      hasViewedStory(s.id, uid),
    );

  if (stories.length === 0 && !showCreate) {
    return (
      <div className={cn("px-3 pt-2 pb-1", className)}>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex flex-col items-center gap-1 flex-shrink-0 group"
        >
          <div className="w-12 h-12 rounded-full border-2 border-dashed border-border group-hover:border-primary/60 transition-colors flex items-center justify-center bg-muted/50">
            <Plus
              size={18}
              className="text-muted-foreground group-hover:text-primary transition-colors"
            />
          </div>
          <span className="text-[10px] text-muted-foreground">Add story</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-3 px-3 pt-2 pb-2 overflow-x-auto no-scrollbar border-b border-border/40",
          className,
        )}
        style={{ scrollbarWidth: "none" }}
      >
        {/* Add story button */}
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex flex-col items-center gap-1 flex-shrink-0 group"
        >
          {myStories.length > 0 ? (
            <div
              className={isAllViewed(uid) ? "story-ring-viewed" : "story-ring"}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-muted">
                <UserAvatar
                  src={currentUser?.profilePicture}
                  username={currentUser?.username ?? "Me"}
                  size="md"
                  showOnline={false}
                />
              </div>
            </div>
          ) : (
            <div className="relative w-12 h-12 rounded-full border-2 border-dashed border-border group-hover:border-primary/60 transition-colors flex items-center justify-center bg-muted/50">
              <UserAvatar
                src={currentUser?.profilePicture}
                username={currentUser?.username ?? "Me"}
                size="md"
                showOnline={false}
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full gradient-btn flex items-center justify-center">
                <Plus size={10} className="text-white" />
              </div>
            </div>
          )}
          <span className="text-[10px] text-muted-foreground truncate w-12 text-center">
            {myStories.length > 0 ? "Your story" : "Add story"}
          </span>
        </button>

        {/* Other users' stories */}
        {otherAuthors.map((authorId) => {
          const authorStories = storiesByAuthor.get(authorId)!;
          const first = authorStories[0];
          const allViewed = isAllViewed(authorId);

          return (
            <button
              type="button"
              key={authorId}
              onClick={() => openStories(authorId)}
              className="flex flex-col items-center gap-1 flex-shrink-0"
            >
              <div className={allViewed ? "story-ring-viewed" : "story-ring"}>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden"
                  style={{
                    background: first.bgColor || "oklch(0.62 0.27 345)",
                  }}
                >
                  {first.authorUsername.charAt(0).toUpperCase()}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground truncate w-12 text-center">
                {first.authorUsername}
              </span>
            </button>
          );
        })}

        {/* My stories viewer */}
        {myStories.length > 0 && (
          <button
            type="button"
            key="my-view"
            onClick={() => openStories(uid)}
            className="hidden"
          />
        )}
      </div>

      {/* Create story modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card rounded-3xl border border-border p-5 space-y-4">
            <h3
              className="font-bold text-base"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Create Story
            </h3>
            <textarea
              className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
              placeholder="What's on your mind?"
              rows={3}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
            />
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Background color
              </p>
              <div className="flex gap-2 flex-wrap">
                {STORY_BG_COLORS.map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => setSelectedBg(bg)}
                    className={`w-8 h-8 rounded-full flex-shrink-0 transition-all ${
                      selectedBg === bg
                        ? "ring-2 ring-white ring-offset-2 ring-offset-card scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ background: bg }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!newText.trim()}
                className="flex-1 py-2.5 rounded-xl gradient-btn text-white text-sm font-semibold disabled:opacity-50"
              >
                Share Story
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Story viewer */}
      {viewingStories && (
        <StoryViewer
          stories={viewingStories}
          initialIndex={viewingIdx}
          currentUid={uid}
          onClose={() => {
            setViewingStories(null);
            refresh();
          }}
        />
      )}
    </>
  );
}
