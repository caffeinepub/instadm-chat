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
  {
    label: "Night Sky",
    value: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)",
  },
  { label: "Neon", value: "linear-gradient(135deg,#f953c6,#b91d73)" },
  { label: "Mint", value: "linear-gradient(135deg,#00b09b,#96c93d)" },
  { label: "Sky", value: "linear-gradient(135deg,#56ccf2,#2f80ed)" },
];

const TEXT_COLORS = [
  { label: "White", value: "#ffffff" },
  { label: "Black", value: "#000000" },
  { label: "Yellow", value: "#FFD700" },
  { label: "Pink", value: "#ff6b9d" },
  { label: "Cyan", value: "#00e5ff" },
  { label: "Green", value: "#69ff6e" },
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

      // Get chat participant IDs from localStorage — only show stories from chatted users
      const chatPartners = new Set<string>();
      try {
        const storedChats = localStorage.getItem("linkr_chats");
        if (storedChats) {
          const parsed = JSON.parse(storedChats) as Array<{
            participants: string[];
          }>;
          for (const chat of parsed) {
            for (const p of chat.participants) {
              chatPartners.add(p);
            }
          }
        }
      } catch {
        /* ignore */
      }

      // Only show stories from users you've chatted with (or yourself)
      const filteredGroups =
        chatPartners.size > 0
          ? groups.filter(
              (g) => chatPartners.has(g.authorId) || g.authorId === uid,
            )
          : groups;
      setFeedGroups(filteredGroups);
    } catch {
      // silently fail
    }
  }, [actor, uid]);

  useEffect(() => {
    loadStories();
    pollRef.current = setInterval(loadStories, 15000);
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

const QUICK_EMOJIS = ["❤️", "🔥", "✨", "😍", "🥳", "😎", "💯", "🎉"];

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
  const [storyTab, setStoryTab] = useState<"text" | "photo">("text");
  const [fontStyle, setFontStyle] = useState<"normal" | "bold" | "italic">(
    "normal",
  );
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">(
    "center",
  );
  const [textColor, setTextColor] = useState("#ffffff");

  const previewTextStyle: React.CSSProperties = {
    color: textColor,
    fontWeight: fontStyle === "bold" ? 700 : 400,
    fontStyle: fontStyle === "italic" ? "italic" : "normal",
    textAlign,
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-card rounded-3xl border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3
            className="font-bold text-base"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Create Story
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors"
            data-ocid="story.create.close_button"
          >
            <X size={14} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-0 px-5 pb-3">
          <button
            type="button"
            onClick={() => setStoryTab("text")}
            className={cn(
              "flex-1 py-2 text-xs font-semibold rounded-l-xl border transition-colors",
              storyTab === "text"
                ? "bg-primary text-white border-primary"
                : "bg-muted text-muted-foreground border-border hover:bg-accent",
            )}
            data-ocid="story.tab.text"
          >
            ✏️ Text
          </button>
          <button
            type="button"
            onClick={() => setStoryTab("photo")}
            className={cn(
              "flex-1 py-2 text-xs font-semibold rounded-r-xl border-t border-r border-b transition-colors",
              storyTab === "photo"
                ? "bg-primary text-white border-primary"
                : "bg-muted text-muted-foreground border-border hover:bg-accent",
            )}
            data-ocid="story.tab.photo"
          >
            📷 Photo
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4 overflow-y-auto max-h-[72vh]">
          {/* Live preview */}
          <div
            className="w-full h-36 rounded-2xl flex items-center justify-center overflow-hidden relative"
            style={{ background: mediaFile ? "#000" : selectedBg }}
          >
            {mediaFile ? (
              <img
                src={mediaFile}
                alt="Story preview"
                className="w-full h-full object-cover"
              />
            ) : null}
            {text && (
              <p
                className="text-lg px-4 drop-shadow-lg absolute inset-x-0 bottom-4"
                style={previewTextStyle}
              >
                {text}
              </p>
            )}
            {!mediaFile && !text && (
              <p className="text-white/50 text-sm">Preview</p>
            )}
          </div>

          {storyTab === "text" ? (
            <>
              {/* Text input */}
              <textarea
                className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 transition-shadow"
                placeholder="Add text to your story..."
                rows={2}
                value={text}
                onChange={(e) => onTextChange(e.target.value)}
                maxLength={200}
                data-ocid="story.create.textarea"
              />

              {/* Quick emoji row */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                  Quick Emoji
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => onTextChange(text + emoji)}
                      className="w-8 h-8 rounded-lg bg-muted hover:bg-accent text-lg flex items-center justify-center transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font style picker */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                  Font Style
                </p>
                <div className="flex gap-1.5">
                  {(["normal", "bold", "italic"] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setFontStyle(style)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border flex-1",
                        fontStyle === style
                          ? "bg-primary text-white border-primary"
                          : "bg-muted border-border text-muted-foreground hover:bg-accent",
                      )}
                      style={{
                        fontWeight: style === "bold" ? 700 : 400,
                        fontStyle: style === "italic" ? "italic" : "normal",
                      }}
                    >
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text alignment */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                  Text Alignment
                </p>
                <div className="flex gap-1.5">
                  {(["left", "center", "right"] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => setTextAlign(align)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border flex-1",
                        textAlign === align
                          ? "bg-primary text-white border-primary"
                          : "bg-muted border-border text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {align === "left" ? "⬅" : align === "center" ? "↔" : "➡"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text color picker */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                  Text Color
                </p>
                <div className="flex gap-2 flex-wrap">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      onClick={() => setTextColor(c.value)}
                      className={cn(
                        "w-7 h-7 rounded-full transition-all border-2",
                        textColor === c.value
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-card scale-110"
                          : "border-transparent hover:scale-105",
                      )}
                      style={{
                        background: c.value,
                        borderColor: c.value === "#ffffff" ? "#ccc" : c.value,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Background */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                  Background
                </p>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_BG_COLORS.map((bg) => (
                    <button
                      key={bg.value}
                      type="button"
                      title={bg.label}
                      onClick={() => onBgChange(bg.value)}
                      className={cn(
                        "w-8 h-8 rounded-full flex-shrink-0 transition-all",
                        selectedBg === bg.value
                          ? "ring-2 ring-white ring-offset-2 ring-offset-card scale-110"
                          : "hover:scale-105",
                      )}
                      style={{ background: bg.value }}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Photo tab */}
              <div className="flex flex-col items-center gap-3 py-4">
                {mediaFile ? (
                  <div className="relative w-full">
                    <img
                      src={mediaFile}
                      alt="Selected story media"
                      className="w-full rounded-xl object-cover max-h-48"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        /* handled by parent via onMediaSelect */
                      }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80"
                    >
                      <X size={12} className="text-white" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary/60 hover:bg-muted/30 transition-colors"
                    data-ocid="story.create.upload_button"
                  >
                    <Camera size={24} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">
                      Tap to add photo
                    </span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onMediaSelect}
                />
              </div>

              {/* Caption for photo */}
              <textarea
                className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 transition-shadow"
                placeholder="Add a caption..."
                rows={2}
                value={text}
                onChange={(e) => onTextChange(e.target.value)}
                maxLength={200}
                data-ocid="story.create.textarea"
              />
            </>
          )}

          {/* Close Friends toggle — always visible */}
          <div className="flex items-center justify-between px-1 py-1 rounded-xl bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-base">👁️</span>
              <div>
                <p className="text-xs font-medium">Close Friends Only</p>
                <p className="text-[10px] text-muted-foreground">
                  Only people you've chatted with
                </p>
              </div>
            </div>
            <div
              role="switch"
              aria-checked={isCloseFriends}
              onClick={() => onCloseFriendsChange(!isCloseFriends)}
              onKeyDown={(e) =>
                e.key === "Enter" && onCloseFriendsChange(!isCloseFriends)
              }
              tabIndex={0}
              data-ocid="story.create.switch"
              className={cn(
                "w-10 h-6 rounded-full transition-colors cursor-pointer relative flex-shrink-0",
                isCloseFriends ? "bg-primary" : "bg-border",
              )}
            >
              <div
                className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all",
                  isCloseFriends ? "left-5" : "left-1",
                )}
              />
            </div>
          </div>

          {/* Actions */}
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
              className="flex-1 py-2.5 rounded-xl gradient-btn text-white text-sm font-semibold disabled:opacity-50 transition-all"
              data-ocid="story.create.submit_button"
            >
              {isCreating ? "Sharing..." : "Share Story"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
