import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Heart,
  Image,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useActor } from "../hooks/useActor";
import {
  buildBioWithPayload,
  decodePostsFromBio,
  decodeStoriesFromBio,
  extractPlainBio,
  mergeAllPosts,
} from "../services/bioStorageService";
import {
  type Post,
  addPostComment,
  awardBadge,
  createPost,
  extractHashtags,
  getActiveStories,
  getMood,
  getPosts,
  savePosts,
  togglePostLike,
} from "../services/featureService";

export function FeedPage() {
  const { currentUser } = useAuth();
  const { actor } = useActor();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [postText, setPostText] = useState("");
  const [postImageUrl, setPostImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(
    new Set(),
  );
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>(
    {},
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Enable scrolling
  useEffect(() => {
    document.body.classList.add("page-subpage");
    document.getElementById("root")?.classList.add("page-subpage");
    return () => {
      document.body.classList.remove("page-subpage");
      document.getElementById("root")?.classList.remove("page-subpage");
    };
  }, []);

  // ─── Load global feed from ALL users via ICP ────────────────────────────────
  const loadGlobalFeed = useCallback(
    async (silent = false) => {
      if (!silent) setIsRefreshing(true);
      try {
        // Always include local posts first (most up-to-date for current user)
        const localPosts = getPosts();

        if (actor) {
          // Fetch ALL users in parallel using alphabet prefix search
          // This ensures we catch every registered user regardless of username
          const alphabetLetters = "abcdefghijklmnopqrstuvwxyz0123456789".split(
            "",
          );
          const searchResults = await Promise.allSettled([
            actor.searchUsersByUsername(""), // catch-all for short usernames
            ...alphabetLetters.map((letter) =>
              actor.searchUsersByUsernamePrefix(letter),
            ),
          ]);

          // Deduplicate users by their principal ID
          const seenUids = new Set<string>();
          const allProfiles: import("../backend.d").UserProfile[] = [];
          for (const result of searchResults) {
            if (result.status === "fulfilled") {
              for (const profile of result.value) {
                const uid = profile._id?.toString();
                if (uid && !seenUids.has(uid)) {
                  seenUids.add(uid);
                  allProfiles.push(profile);
                }
              }
            }
          }

          const postsPerUser: Post[][] = [localPosts];

          // Decode posts from each user's bio
          for (const profile of allProfiles) {
            const uid = profile._id?.toString();
            if (!uid || uid === currentUser?.uid) continue;
            const rawBio = profile.bio ?? "";
            const userPosts = decodePostsFromBio(rawBio);
            if (userPosts.length > 0) {
              postsPerUser.push(userPosts);
            }
          }

          const merged = mergeAllPosts(postsPerUser);
          setPosts(merged);
        } else {
          setPosts(localPosts);
        }
      } catch {
        // Fallback to local posts
        setPosts(getPosts());
      } finally {
        if (!silent) setIsRefreshing(false);
      }
    },
    [actor, currentUser?.uid],
  );

  // Initial load + periodic refresh every 3 seconds for real-time feel
  useEffect(() => {
    loadGlobalFeed(false);

    refreshTimerRef.current = setInterval(() => {
      loadGlobalFeed(true);
    }, 3000);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [loadGlobalFeed]);

  // BroadcastChannel for same-browser real-time sync across tabs
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("linkr_feed_updates");
    channel.onmessage = () => {
      loadGlobalFeed(true);
    };
    return () => channel.close();
  }, [loadGlobalFeed]);

  // ─── Save current user's posts to ICP bio ────────────────────────────────────
  const savePostsToBio = useCallback(
    async (updatedPosts: Post[]) => {
      if (!actor || !currentUser) return;
      try {
        const callerProfile = await actor.getCallerUserProfile();
        if (!callerProfile) return;

        const plainBio = extractPlainBio(callerProfile.bio ?? "");
        const activeStories = getActiveStories().filter(
          (s) => s.authorId === currentUser.uid,
        );
        const newBio = buildBioWithPayload(
          plainBio,
          updatedPosts,
          activeStories,
        );

        await actor.saveCallerUserProfile({
          ...callerProfile,
          bio: newBio,
        });
      } catch {
        // Non-fatal — posts are still saved locally
      }
    },
    [actor, currentUser],
  );

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImagePreview(result);
      setPostImageUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handlePost = async () => {
    if (!currentUser || !postText.trim()) return;
    setIsPosting(true);
    try {
      const hashtags = extractHashtags(postText);
      const newPost = createPost({
        authorId: currentUser.uid,
        authorUsername: currentUser.username,
        authorAvatar: currentUser.profilePicture || "",
        text: postText.trim(),
        mediaUrl: postImageUrl || undefined,
        hashtags,
        createdAt: Date.now(),
      });
      const updatedPosts = getPosts();
      setPosts(updatedPosts);
      setPostText("");
      setPostImageUrl("");
      setImagePreview(null);

      // Award poster badge
      const awarded = awardBadge(currentUser.uid, "poster");
      if (awarded) {
        toast.success("📝 Badge Earned: Content Creator!");
      }

      // Save posts to ICP bio for cross-device visibility
      savePostsToBio(updatedPosts);

      // Broadcast to other tabs on same browser
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("linkr_feed_updates");
        channel.postMessage({ type: "new_post", postId: newPost.id });
        channel.close();
      }

      // Reload feed to show merged global feed
      setTimeout(() => loadGlobalFeed(true), 1000);
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = (postId: string) => {
    if (!currentUser) return;
    const updated = togglePostLike(postId, currentUser.uid);
    // Merge local update into displayed feed
    setPosts((prev) =>
      prev.map((p) => {
        const local = updated.find((u) => u.id === p.id);
        return local ?? p;
      }),
    );
    // Save updated likes to bio
    savePostsToBio(getPosts());
  };

  const handleComment = (postId: string) => {
    if (!currentUser) return;
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    const updated = addPostComment(postId, {
      authorId: currentUser.uid,
      authorUsername: currentUser.username,
      text,
      createdAt: Date.now(),
    });
    setPosts((prev) =>
      prev.map((p) => {
        const local = updated.find((u) => u.id === p.id);
        return local ?? p;
      }),
    );
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    savePostsToBio(getPosts());
  };

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const renderPostText = (text: string) => {
    return text.split(/(\s+)/).map((word, i) => {
      const k = `${word}-${i}`;
      if (word.startsWith("#")) {
        return (
          <span
            key={k}
            className="text-primary font-semibold cursor-pointer hover:underline"
          >
            {word}
          </span>
        );
      }
      return <span key={k}>{word}</span>;
    });
  };

  return (
    <div className="min-h-dvh bg-background page-fade overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl w-9 h-9 flex-shrink-0"
          onClick={() => navigate({ to: "/" })}
          data-ocid="feed.back.button"
        >
          <ArrowLeft size={18} />
        </Button>
        <div className="flex items-center gap-2 flex-1">
          <Sparkles size={18} className="text-primary" />
          <h1
            className="font-bold text-lg tracking-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Feed
          </h1>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-medium text-green-600 dark:text-green-400">
              Live
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl w-9 h-9"
          onClick={() => loadGlobalFeed(false)}
          disabled={isRefreshing}
          title="Refresh feed"
          data-ocid="feed.refresh.button"
        >
          <RefreshCw
            size={16}
            className={
              isRefreshing
                ? "animate-spin text-primary"
                : "text-muted-foreground"
            }
          />
        </Button>
      </div>

      <div className="max-w-lg mx-auto pb-10">
        {/* Create post */}
        {currentUser && (
          <div className="px-4 pt-4 pb-3">
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
              <div className="flex items-start gap-3 p-4">
                <Avatar className="w-9 h-9 flex-shrink-0">
                  <AvatarImage src={currentUser.profilePicture} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {currentUser.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <Textarea
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder={`Share something, ${currentUser.username}... Use #hashtags`}
                    className="min-h-[80px] resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
                    maxLength={1000}
                    data-ocid="feed.post.textarea"
                  />
                  {imagePreview && (
                    <div className="relative mt-2 inline-block">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-48 rounded-xl object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setPostImageUrl("");
                        }}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80"
                      >
                        <X size={12} className="text-white" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground text-xs font-medium"
                    data-ocid="feed.photo.button"
                  >
                    <Image size={14} className="text-primary" />
                    Photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </div>
                <Button
                  size="sm"
                  className="rounded-xl gradient-btn gap-1.5 h-8 px-4"
                  onClick={handlePost}
                  disabled={!postText.trim() || isPosting}
                  data-ocid="feed.post.submit_button"
                >
                  {isPosting ? (
                    <Loader2 size={13} className="text-white animate-spin" />
                  ) : (
                    <Send size={13} className="text-white" />
                  )}
                  <span className="text-white text-xs font-semibold">Post</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isRefreshing && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={24} className="text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">
              Loading feed from all users...
            </p>
          </div>
        )}

        {/* Posts list */}
        {!isRefreshing && posts.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 gap-4 px-8"
            data-ocid="feed.empty_state"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Sparkles
                size={28}
                className="text-muted-foreground"
                strokeWidth={1.5}
              />
            </div>
            <div className="text-center">
              <p className="font-semibold">No posts yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Be the first to share something!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-0" data-ocid="feed.list">
            {posts.map((post, idx) => {
              const isLiked =
                currentUser && post.likes.includes(currentUser.uid);
              const showComments = expandedComments.has(post.id);
              const mood = getMood(post.authorId);

              return (
                <div
                  key={post.id}
                  className="border-b border-border/50 last:border-b-0"
                  data-ocid={`feed.post.item.${idx + 1}`}
                >
                  {/* Post header */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={post.authorAvatar} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                        {post.authorUsername.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">
                        @{post.authorUsername}
                      </p>
                      <div className="flex items-center gap-2">
                        {mood && (
                          <span className="text-xs text-muted-foreground">
                            {mood}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(post.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Post text */}
                  <div className="px-4 pb-2">
                    <p className="text-sm leading-relaxed">
                      {renderPostText(post.text)}
                    </p>
                  </div>

                  {/* Post image */}
                  {post.mediaUrl && (
                    <div className="px-4 pb-2">
                      <img
                        src={post.mediaUrl}
                        alt="Post"
                        className="w-full rounded-xl max-h-80 object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Hashtags */}
                  {post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                      {post.hashtags.slice(0, 5).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs rounded-full px-2 py-0.5 cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 px-4 pb-3">
                    <button
                      type="button"
                      onClick={() => handleLike(post.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-accent transition-colors"
                      data-ocid={`feed.post.like.button.${idx + 1}`}
                    >
                      <Heart
                        size={16}
                        className={
                          isLiked
                            ? "fill-red-500 text-red-500"
                            : "text-muted-foreground"
                        }
                      />
                      <span className="text-xs font-medium text-muted-foreground">
                        {post.likes.length > 0 ? post.likes.length : "Like"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleComments(post.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-accent transition-colors"
                      data-ocid={`feed.post.comment.button.${idx + 1}`}
                    >
                      <MessageCircle
                        size={16}
                        className="text-muted-foreground"
                      />
                      <span className="text-xs font-medium text-muted-foreground">
                        {post.comments.length > 0
                          ? post.comments.length
                          : "Comment"}
                      </span>
                    </button>
                  </div>

                  {/* Comments section */}
                  {showComments && (
                    <div className="px-4 pb-3 space-y-2 bg-muted/20">
                      {post.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="flex items-start gap-2 pt-2"
                        >
                          <Avatar className="w-7 h-7 flex-shrink-0">
                            <AvatarFallback className="bg-accent text-accent-foreground text-[10px] font-bold">
                              {comment.authorUsername.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="bg-card rounded-xl px-3 py-2 border border-border/50">
                              <p className="text-xs font-semibold text-primary">
                                @{comment.authorUsername}
                              </p>
                              <p className="text-xs mt-0.5">{comment.text}</p>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 pl-1">
                              {formatRelativeTime(comment.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                      {currentUser && (
                        <div className="flex items-center gap-2 pt-1">
                          <Avatar className="w-7 h-7 flex-shrink-0">
                            <AvatarImage src={currentUser.profilePicture} />
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                              {currentUser.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 flex gap-2">
                            <input
                              type="text"
                              value={commentInputs[post.id] ?? ""}
                              onChange={(e) =>
                                setCommentInputs((prev) => ({
                                  ...prev,
                                  [post.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleComment(post.id);
                                }
                              }}
                              placeholder="Add a comment..."
                              className="flex-1 bg-card border border-border rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-primary/50 transition-colors"
                              data-ocid={`feed.post.comment.input.${idx + 1}`}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 rounded-xl hover:bg-primary/10"
                              onClick={() => handleComment(post.id)}
                              data-ocid={`feed.post.comment.submit_button.${idx + 1}`}
                            >
                              <Send size={13} className="text-primary" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-6 text-center">
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

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}
