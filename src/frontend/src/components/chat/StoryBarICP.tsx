import { cn } from "@/lib/utils";
import { Camera, Plus, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Story } from "../../backend.d";
import { useAuth } from "../../contexts/AuthContext";
import { useActor } from "../../hooks/useActor";
import { StoryViewerICP } from "./StoryViewerICP";

const STATUS_BG_COLORS = [
  { label: "Pink Violet", value: "linear-gradient(135deg,#e1306c,#833ab4)" },
  { label: "Ocean Blue", value: "linear-gradient(135deg,#1a73e8,#0d47a1)" },
  { label: "Sunset", value: "linear-gradient(135deg,#f46b45,#eea849)" },
  { label: "Forest", value: "linear-gradient(135deg,#1a8a2e,#3ab54a)" },
  { label: "Purple Dream", value: "linear-gradient(135deg,#6c3483,#a569bd)" },
  { label: "Teal", value: "linear-gradient(135deg,#00838f,#00bcd4)" },
  { label: "Crimson", value: "linear-gradient(135deg,#b71c1c,#e53935)" },
  { label: "Gold", value: "linear-gradient(135deg,#f57f17,#ffca28)" },
];

interface GroupedStories {
  authorId: string;
  authorUsername: string;
  stories: Story[];
  allViewed: boolean;
}

interface StoryBarICPProps {
  className?: string;
}

export function StoryBarICP({ className }: StoryBarICPProps) {
  const { currentUser } = useAuth();
  const { actor } = useActor();
  const uid = currentUser!.uid;

  const [feedGroups, setFeedGroups] = useState<GroupedStories[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [viewingGroup, setViewingGroup] = useState<GroupedStories | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newText, setNewText] = useState("");
  const [selectedBg, setSelectedBg] = useState(STATUS_BG_COLORS[0].value);
  const [isCloseFriends, setIsCloseFriends] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [mediaFile, setMediaFile] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStories = useCallback(async () => {
    if (!actor) return;
    const nowNs = BigInt(Date.now()) * 1_000_000n;
    const expired = (story: Story) =>
      story.expiresAt > 0n && story.expiresAt < nowNs;

    try {
      const [feedData, myData] = await Promise.all([
        actor.getStoriesForFeed(),
        actor.getMyStories(),
      ]);

      // Filter expired stories
      const validMyStories = myData.filter((s) => !expired(s));
      setMyStories(validMyStories);

      const groups: GroupedStories[] = [];
      for (const [authorPrincipal, stories] of feedData) {
        const validStories = stories.filter((s) => !expired(s));
        if (validStories.length === 0) continue;
        const authorId = authorPrincipal.toString();
        groups.push({
          authorId,
          authorUsername: `user_${authorId.slice(0, 6)}`,
          stories: validStories,
          allViewed: validStories.every((s) =>
            s.views.some((v) => v.toString() === uid),
          ),
        });
      }
      setFeedGroups(groups);
    } catch {
      // silently fail
    }
  }, [actor, uid]);

  useEffect(() => {
    loadStories();
    pollRef.current = setInterval(loadStories, 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadStories]);

  const handleCreate = async () => {
    if (!actor || (!newText.trim() && !mediaFile)) return;
    setIsCreating(true);
    try {
      await actor.createStory(
        newText.trim(),
        mediaFile,
        selectedBg,
        isCloseFriends,
      );
      toast.success("Story shared!");
      setShowCreate(false);
      setNewText("");
      setMediaFile("");
      await loadStories();
    } catch {
      toast.error("Failed to create story");
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setMediaFile(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const myGroup: GroupedStories | null =
    myStories.length > 0
      ? {
          authorId: uid,
          authorUsername: currentUser?.username ?? "Me",
          stories: myStories,
          allViewed: false,
        }
      : null;

  const hasStories = myGroup || feedGroups.length > 0;

  if (!hasStories) {
    return (
      <div className={cn("px-3 pt-2 pb-1", className)}>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex flex-col items-center gap-1 group"
          data-ocid="story.add_button"
        >
          <div className="relative w-12 h-12 rounded-full border-2 border-dashed border-border group-hover:border-primary/60 transition-colors flex items-center justify-center bg-muted/50">
            <span className="text-lg font-bold text-muted-foreground group-hover:text-primary transition-colors">
              {currentUser?.username?.charAt(0)?.toUpperCase() ?? "?"}
            </span>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full gradient-btn flex items-center justify-center">
              <Plus size={10} className="text-white" />
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground">Add story</span>
        </button>

        {showCreate && (
          <CreateStoryModal
            text={newText}
            onTextChange={setNewText}
            selectedBg={selectedBg}
            onBgChange={setSelectedBg}
            isCloseFriends={isCloseFriends}
            onCloseFriendsChange={setIsCloseFriends}
            mediaFile={mediaFile}
            onMediaSelect={handleFileSelect}
            fileInputRef={fileInputRef}
            isCreating={isCreating}
            onSubmit={handleCreate}
            onClose={() => setShowCreate(false)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-3 px-3 pt-2 pb-2 overflow-x-auto border-b border-border/40",
          className,
        )}
        style={{ scrollbarWidth: "none" }}
      >
        {/* My story / add story */}
        <button
          type="button"
          onClick={() => {
            if (myGroup) setViewingGroup(myGroup);
            else setShowCreate(true);
          }}
          className="flex flex-col items-center gap-1 flex-shrink-0 group"
          data-ocid="story.my.button"
        >
          {myGroup ? (
            <div className="story-ring-active">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center font-bold text-sm text-primary">
                {currentUser?.username?.charAt(0)?.toUpperCase()}
              </div>
            </div>
          ) : (
            <div className="relative w-12 h-12 rounded-full border-2 border-dashed border-border group-hover:border-primary/60 transition-colors flex items-center justify-center bg-muted/50">
              <span className="text-base font-bold text-muted-foreground">
                {currentUser?.username?.charAt(0)?.toUpperCase()}
              </span>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full gradient-btn flex items-center justify-center">
                <Plus size={10} className="text-white" />
              </div>
            </div>
          )}
          <span className="text-[10px] text-muted-foreground truncate w-12 text-center">
            {myGroup ? "Your story" : "Add story"}
          </span>
        </button>

        {/* Add button when already have stories */}
        {myGroup && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex flex-col items-center gap-1 flex-shrink-0 group"
            data-ocid="story.add_more.button"
          >
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-border group-hover:border-primary/60 flex items-center justify-center bg-muted/40">
              <Plus
                size={14}
                className="text-muted-foreground group-hover:text-primary transition-colors"
              />
            </div>
            <span className="text-[10px] text-muted-foreground">Add</span>
          </button>
        )}

        {/* Other users' story groups */}
        {feedGroups.map((group) => (
          <button
            type="button"
            key={group.authorId}
            onClick={() => setViewingGroup(group)}
            className="flex flex-col items-center gap-1 flex-shrink-0"
            data-ocid="story.user.button"
          >
            <div
              className={group.allViewed ? "story-ring-viewed" : "story-ring"}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{
                  background:
                    group.stories[0]?.bgColor || "oklch(0.62 0.27 345)",
                }}
              >
                {group.authorUsername.charAt(0).toUpperCase()}
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground truncate w-12 text-center">
              {group.authorUsername}
            </span>
          </button>
        ))}
      </div>

      {/* Create story modal */}
      {showCreate && (
        <CreateStoryModal
          text={newText}
          onTextChange={setNewText}
          selectedBg={selectedBg}
          onBgChange={setSelectedBg}
          isCloseFriends={isCloseFriends}
          onCloseFriendsChange={setIsCloseFriends}
          mediaFile={mediaFile}
          onMediaSelect={handleFileSelect}
          fileInputRef={fileInputRef}
          isCreating={isCreating}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Story viewer */}
      {viewingGroup && (
        <StoryViewerICP
          group={viewingGroup}
          currentUid={uid}
          onClose={() => {
            setViewingGroup(null);
            loadStories();
          }}
          onDelete={async (storyId) => {
            if (!actor) return;
            try {
              await actor.deleteStory(storyId);
              toast.success("Story deleted");
              setViewingGroup(null);
              loadStories();
            } catch {
              toast.error("Failed to delete story");
            }
          }}
          onReact={async (storyId, emoji) => {
            if (!actor) return;
            try {
              await actor.reactToStory(storyId, emoji);
            } catch {}
          }}
          onAddHighlight={async (storyId, title) => {
            if (!actor) return;
            try {
              await actor.addToHighlights(storyId, title);
              toast.success("Added to highlights!");
            } catch {}
          }}
        />
      )}
    </>
  );
}

// ─── Create Story Modal ───────────────────────────────────────────────────────

function CreateStoryModal({
  text,
  onTextChange,
  selectedBg,
  onBgChange,
  isCloseFriends,
  onCloseFriendsChange,
  mediaFile,
  onMediaSelect,
  fileInputRef,
  isCreating,
  onSubmit,
  onClose,
}: {
  text: string;
  onTextChange: (v: string) => void;
  selectedBg: string;
  onBgChange: (v: string) => void;
  isCloseFriends: boolean;
  onCloseFriendsChange: (v: boolean) => void;
  mediaFile: string;
  onMediaSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isCreating: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-card rounded-3xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3
            className="font-bold text-base"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Create Story
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-accent"
          >
            <X size={14} />
          </button>
        </div>

        {/* Preview */}
        <div
          className="w-full h-32 rounded-2xl flex items-center justify-center overflow-hidden"
          style={{ background: mediaFile ? "transparent" : selectedBg }}
        >
          {mediaFile ? (
            <img
              src={mediaFile}
              alt="Story preview"
              className="w-full h-full object-cover rounded-2xl"
            />
          ) : (
            <p className="text-white font-bold text-lg text-center px-4 drop-shadow">
              {text || "Your story preview"}
            </p>
          )}
        </div>

        <textarea
          className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
          placeholder="Add text to your story..."
          rows={2}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          maxLength={200}
          data-ocid="story.create.textarea"
        />

        <div>
          <p className="text-xs text-muted-foreground mb-2">Background</p>
          <div className="flex gap-2 flex-wrap">
            {STATUS_BG_COLORS.map((bg) => (
              <button
                key={bg.value}
                type="button"
                title={bg.label}
                onClick={() => onBgChange(bg.value)}
                className={`w-8 h-8 rounded-full flex-shrink-0 transition-all ${
                  selectedBg === bg.value
                    ? "ring-2 ring-white ring-offset-2 ring-offset-card scale-110"
                    : "hover:scale-105"
                }`}
                style={{ background: bg.value }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-accent transition-colors"
            data-ocid="story.create.upload_button"
          >
            <Camera size={14} className="text-primary" />
            Add Photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onMediaSelect}
          />
          <div className="flex items-center gap-2 cursor-pointer ml-auto">
            <span className="text-xs text-muted-foreground">
              Close Friends only
            </span>
            <div
              role="switch"
              aria-checked={isCloseFriends}
              onClick={() => onCloseFriendsChange(!isCloseFriends)}
              onKeyDown={(e) =>
                e.key === "Enter" && onCloseFriendsChange(!isCloseFriends)
              }
              tabIndex={0}
              className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${
                isCloseFriends ? "bg-primary" : "bg-border"
              } relative`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                  isCloseFriends ? "left-[18px]" : "left-0.5"
                }`}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors"
            data-ocid="story.create.cancel_button"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={(!text.trim() && !mediaFile) || isCreating}
            className="flex-1 py-2.5 rounded-xl gradient-btn text-white text-sm font-semibold disabled:opacity-50"
            data-ocid="story.create.submit_button"
          >
            {isCreating ? "Sharing..." : "Share Story"}
          </button>
        </div>
      </div>
    </div>
  );
}
