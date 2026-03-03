import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Camera,
  Eye,
  Lock,
  Plus,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Status } from "../backend.d";
import { useAuth } from "../contexts/AuthContext";
import { useActor } from "../hooks/useActor";

// ─── Status background presets ───────────────────────────────────────────────

const STATUS_BG_COLORS = [
  { label: "Pink Violet", value: "linear-gradient(135deg,#e1306c,#833ab4)" },
  { label: "Ocean", value: "linear-gradient(135deg,#1a73e8,#0d47a1)" },
  { label: "Sunset", value: "linear-gradient(135deg,#f46b45,#eea849)" },
  { label: "Forest", value: "linear-gradient(135deg,#1a8a2e,#3ab54a)" },
  { label: "Purple", value: "linear-gradient(135deg,#6c3483,#a569bd)" },
  { label: "Teal", value: "linear-gradient(135deg,#00838f,#00bcd4)" },
  { label: "Crimson", value: "linear-gradient(135deg,#b71c1c,#e53935)" },
  { label: "Gold", value: "linear-gradient(135deg,#f57f17,#ffca28)" },
  { label: "Navy", value: "linear-gradient(135deg,#0a0e27,#1a237e)" },
  { label: "Rose", value: "linear-gradient(135deg,#880e4f,#e91e63)" },
  { label: "Dark Teal", value: "linear-gradient(135deg,#00251a,#00695c)" },
  { label: "Coffee", value: "linear-gradient(135deg,#3e2723,#6d4c41)" },
];

const PRIVACY_OPTIONS = [
  { value: "everyone", label: "Everyone", icon: <Users size={14} /> },
  { value: "followers", label: "My Followers", icon: <Users size={14} /> },
  { value: "closefriends", label: "Close Friends", icon: <Lock size={14} /> },
];

// ─── Status viewer (full-screen WhatsApp style) ────────────────────────────

interface StatusViewerProps {
  statuses: Status[];
  initialIndex?: number;
  currentUid: string;
  isOwn: boolean;
  onClose: () => void;
  onDelete?: (statusId: string) => void;
  onMarkViewed?: (statusId: string) => void;
}

function StatusViewer({
  statuses,
  initialIndex = 0,
  isOwn,
  onClose,
  onDelete,
  onMarkViewed,
}: StatusViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  const current = statuses[currentIndex];
  const DURATION = 5000;

  const goNext = useCallback(() => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((i) => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, statuses.length, onClose]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: currentIndex reset intentional
  useEffect(() => {
    if (!current) return;
    onMarkViewed?.(current.id);
    setProgress(0);
    startTimeRef.current = Date.now();

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, goNext, goPrev]);

  if (!current) return null;

  const getBg = () =>
    current.bgColor || "linear-gradient(135deg,#e1306c,#833ab4)";

  const timeAgo = (() => {
    const ts =
      typeof current.createdAt === "bigint"
        ? Number(current.createdAt / 1_000_000n)
        : current.createdAt;
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${hours}h ago`;
  })();

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <div
        className="relative w-full max-w-[360px] h-[640px] sm:h-[80vh] rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: current.photoUrl ? "transparent" : getBg() }}
      >
        {current.photoUrl && (
          <img
            src={current.photoUrl}
            alt="Status"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />

        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-3 pt-4">
          {statuses.map((s, i) => (
            <div
              key={s.id}
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
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-7 left-0 right-0 z-10 flex items-center gap-3 px-4">
          <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm ring-2 ring-white/40 flex items-center justify-center text-white font-bold text-sm">
            {current.authorId.toString().slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold">
              {isOwn ? "Your status" : "Status"}
            </p>
            <p className="text-white/70 text-[10px]">{timeAgo}</p>
          </div>
          {isOwn && (
            <button
              type="button"
              onClick={() => onDelete?.(current.id)}
              className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white/70 hover:text-destructive hover:bg-black/50 transition-colors"
              data-ocid="status.viewer.delete_button"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-colors"
            data-ocid="status.viewer.close_button"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        {current.text && (
          <div className="absolute inset-0 flex items-center justify-center p-10 pointer-events-none">
            <p className="text-white text-2xl font-bold text-center leading-snug drop-shadow-lg">
              {current.text}
            </p>
          </div>
        )}

        {/* Tap zones */}
        <button
          type="button"
          className="absolute left-0 top-16 w-1/3 h-[calc(100%-140px)] z-20 bg-transparent"
          onClick={goPrev}
          aria-label="Previous"
        />
        <button
          type="button"
          className="absolute right-0 top-16 w-1/3 h-[calc(100%-140px)] z-20 bg-transparent"
          onClick={goNext}
          aria-label="Next"
        />

        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-4 flex items-center gap-3">
          {isOwn ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 backdrop-blur-sm text-white text-xs">
              <Eye size={13} />
              <span>{current.views.length} views</span>
            </div>
          ) : (
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm text-white text-sm hover:bg-white/25 transition-colors"
            >
              <Send size={14} />
              Reply
            </button>
          )}
        </div>
      </div>

      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Enter" && onClose()}
        role="button"
        tabIndex={-1}
        aria-label="Close status"
      />
    </div>
  );
}

// ─── Main Status Page ─────────────────────────────────────────────────────────

export function StatusPage() {
  const { currentUser } = useAuth();
  const { actor } = useActor();
  const navigate = useNavigate();
  const uid = currentUser!.uid;

  const [myStatuses, setMyStatuses] = useState<Status[]>([]);
  const [feedStatuses, setFeedStatuses] = useState<Status[]>([]);
  const [viewingStatuses, setViewingStatuses] = useState<Status[] | null>(null);
  const [viewingIsOwn, setViewingIsOwn] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<"text" | "photo">("text");
  const [statusText, setStatusText] = useState("");
  const [selectedBg, setSelectedBg] = useState(STATUS_BG_COLORS[0].value);
  const [photoData, setPhotoData] = useState("");
  const [privacy, setPrivacy] = useState("everyone");
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStatuses = useCallback(async () => {
    if (!actor) return;
    const nowNs = BigInt(Date.now()) * 1_000_000n;
    const expired = (s: Status) => s.expiresAt > 0n && s.expiresAt < nowNs;
    try {
      const [myData, feedData] = await Promise.all([
        actor.getMyStatuses(),
        actor.getStatusFeed(),
      ]);
      setMyStatuses(myData.filter((s) => !expired(s)));
      setFeedStatuses(feedData.filter((s) => !expired(s)));
    } catch {
      // silently fail
    }
  }, [actor]);

  useEffect(() => {
    document.body.classList.add("page-subpage");
    document.getElementById("root")?.classList.add("page-subpage");
    return () => {
      document.body.classList.remove("page-subpage");
      document.getElementById("root")?.classList.remove("page-subpage");
    };
  }, []);

  useEffect(() => {
    loadStatuses();
    pollRef.current = setInterval(loadStatuses, 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadStatuses]);

  const handlePost = async () => {
    if (!actor) return;
    if (tab === "text" && !statusText.trim()) return;
    if (tab === "photo" && !photoData) return;

    setIsPosting(true);
    try {
      await actor.createStatus(
        statusText.trim(),
        selectedBg,
        tab === "photo" ? photoData : "",
        privacy,
      );
      toast.success("Status shared!");
      setShowCreate(false);
      setStatusText("");
      setPhotoData("");
      await loadStatuses();
    } catch {
      toast.error("Failed to share status");
    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = async (statusId: string) => {
    if (!actor) return;
    try {
      await actor.deleteStatus(statusId);
      toast.success("Status deleted");
      setViewingStatuses(null);
      await loadStatuses();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleMarkViewed = async (statusId: string) => {
    if (!actor) return;
    try {
      await actor.markStatusViewed(statusId);
    } catch {}
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoData(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const isViewed = (s: Status) => s.views.some((v) => v.toString() === uid);

  // Group feed statuses by author
  const feedByAuthor = new Map<string, Status[]>();
  for (const s of feedStatuses) {
    const aid = s.authorId.toString();
    if (!feedByAuthor.has(aid)) feedByAuthor.set(aid, []);
    feedByAuthor.get(aid)!.push(s);
  }

  return (
    <div className="min-h-dvh bg-background page-fade flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl w-9 h-9"
          onClick={() => navigate({ to: "/" })}
          data-ocid="status.back.button"
        >
          <ArrowLeft size={18} />
        </Button>
        <h1
          className="font-bold text-lg tracking-tight flex-1"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Status
        </h1>
        <Button
          size="sm"
          className="gradient-btn rounded-xl gap-1.5 h-8 px-3"
          onClick={() => setShowCreate(true)}
          data-ocid="status.add.open_modal_button"
        >
          <Plus size={13} className="text-white" />
          <span className="text-white text-xs font-semibold">Add</span>
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
          {/* My status */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              My Status
            </p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  if (myStatuses.length > 0) {
                    setViewingStatuses(myStatuses);
                    setViewingIsOwn(true);
                  } else {
                    setShowCreate(true);
                  }
                }}
                className="flex flex-col items-center gap-2"
                data-ocid="status.my.button"
              >
                <div className="relative">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg ring-2 ${
                      myStatuses.length > 0
                        ? "ring-primary"
                        : "ring-dashed ring-border"
                    }`}
                    style={{
                      background:
                        myStatuses.length > 0
                          ? myStatuses[0]?.bgColor ||
                            "linear-gradient(135deg,#e1306c,#833ab4)"
                          : "oklch(var(--muted))",
                    }}
                  >
                    {currentUser?.username?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full gradient-btn flex items-center justify-center">
                    <Plus size={10} className="text-white" />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {myStatuses.length > 0
                    ? `${myStatuses.length} active`
                    : "Add status"}
                </span>
              </button>

              {myStatuses.length > 0 && (
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {currentUser?.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {myStatuses.length} status
                    {myStatuses.length !== 1 ? "es" : ""} ·{" "}
                    {myStatuses.reduce((sum, s) => sum + s.views.length, 0)}{" "}
                    total views
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent updates (from followed users) */}
          {feedStatuses.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Recent Updates
              </p>
              <div className="space-y-1">
                {[...feedByAuthor.entries()].map(([authorId, statuses]) => {
                  const latest = statuses[0];
                  const allViewed = statuses.every((s) => isViewed(s));
                  return (
                    <button
                      key={authorId}
                      type="button"
                      onClick={() => {
                        setViewingStatuses(statuses);
                        setViewingIsOwn(false);
                      }}
                      className="flex items-center gap-4 w-full px-3 py-3 rounded-2xl hover:bg-accent transition-colors"
                      data-ocid="status.user.button"
                    >
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ring-2 ring-offset-2 ring-offset-background transition-colors ${
                          allViewed
                            ? "ring-muted-foreground/40"
                            : "ring-primary"
                        }`}
                        style={{
                          background:
                            latest.bgColor ||
                            "linear-gradient(135deg,#e1306c,#833ab4)",
                        }}
                      >
                        {authorId.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p
                          className={`text-sm font-semibold ${allViewed ? "text-muted-foreground" : ""}`}
                        >
                          {authorId.slice(0, 10)}…
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {latest.text || "Photo status"}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {(() => {
                          const ts = Number(latest.createdAt / 1_000_000n);
                          const diff = Date.now() - ts;
                          const h = Math.floor(diff / 3600000);
                          const m = Math.floor(diff / 60000);
                          return h > 0 ? `${h}h` : `${m}m`;
                        })()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {feedStatuses.length === 0 && myStatuses.length === 0 && (
            <div
              className="flex flex-col items-center justify-center py-20 gap-4 text-center"
              data-ocid="status.empty_state"
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg,#e1306c22,#833ab422)",
                }}
              >
                <Camera
                  size={32}
                  className="text-primary/60"
                  strokeWidth={1.5}
                />
              </div>
              <div>
                <p className="font-semibold text-lg">No status updates</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Follow people to see their status updates here.
                </p>
              </div>
              <Button
                className="gradient-btn rounded-xl"
                onClick={() => setShowCreate(true)}
                data-ocid="status.create.open_modal_button"
              >
                <Plus size={16} className="text-white mr-2" />
                <span className="text-white">Add your status</span>
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Viewer */}
      {viewingStatuses && viewingStatuses.length > 0 && (
        <StatusViewer
          statuses={viewingStatuses}
          currentUid={uid}
          isOwn={viewingIsOwn}
          onClose={() => setViewingStatuses(null)}
          onDelete={handleDelete}
          onMarkViewed={handleMarkViewed}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card rounded-3xl border border-border p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3
                className="font-bold text-base"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Add Status
              </h3>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-accent"
              >
                <X size={14} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex rounded-xl overflow-hidden border border-border">
              <button
                type="button"
                onClick={() => setTab("text")}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                  tab === "text"
                    ? "gradient-btn text-white"
                    : "hover:bg-accent text-muted-foreground"
                }`}
                data-ocid="status.create.text.tab"
              >
                Text Status
              </button>
              <button
                type="button"
                onClick={() => setTab("photo")}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                  tab === "photo"
                    ? "gradient-btn text-white"
                    : "hover:bg-accent text-muted-foreground"
                }`}
                data-ocid="status.create.photo.tab"
              >
                Photo Status
              </button>
            </div>

            {/* Preview */}
            <div
              className="w-full h-40 rounded-2xl flex items-center justify-center overflow-hidden relative"
              style={{
                background:
                  tab === "photo" && photoData ? "transparent" : selectedBg,
              }}
            >
              {tab === "photo" && photoData ? (
                <>
                  <img
                    src={photoData}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  {statusText && (
                    <p className="absolute bottom-4 left-4 right-4 text-white font-bold text-center drop-shadow text-sm">
                      {statusText}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-white font-bold text-xl text-center px-6 drop-shadow">
                  {statusText || "Preview"}
                </p>
              )}
            </div>

            {tab === "text" && (
              <>
                <Input
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="Type your status..."
                  className="rounded-xl"
                  maxLength={200}
                  data-ocid="status.create.text.input"
                />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Background
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {STATUS_BG_COLORS.map((bg) => (
                      <button
                        key={bg.value}
                        type="button"
                        title={bg.label}
                        onClick={() => setSelectedBg(bg.value)}
                        className={`w-8 h-8 rounded-full transition-all ${
                          selectedBg === bg.value
                            ? "ring-2 ring-white ring-offset-2 ring-offset-card scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{ background: bg.value }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {tab === "photo" && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors flex items-center justify-center gap-2"
                  data-ocid="status.create.photo.upload_button"
                >
                  <Camera size={16} />
                  {photoData ? "Change Photo" : "Select Photo"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Input
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="Add caption (optional)..."
                  className="rounded-xl"
                  maxLength={200}
                  data-ocid="status.create.caption.input"
                />
              </>
            )}

            {/* Privacy */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Who can see this
              </p>
              <div className="flex gap-2">
                {PRIVACY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPrivacy(opt.value)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors ${
                      privacy === opt.value
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border hover:bg-accent text-muted-foreground"
                    }`}
                    data-ocid={`status.create.privacy.${opt.value}.button`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors"
                data-ocid="status.create.cancel_button"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePost}
                disabled={
                  isPosting ||
                  (tab === "text" ? !statusText.trim() : !photoData)
                }
                className="flex-1 py-2.5 rounded-xl gradient-btn text-white text-sm font-semibold disabled:opacity-50"
                data-ocid="status.create.submit_button"
              >
                {isPosting ? "Sharing..." : "Share"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-4 text-center border-t border-border/30">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            Built with love using caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
