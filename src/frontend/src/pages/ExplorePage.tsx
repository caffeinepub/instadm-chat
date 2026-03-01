import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Compass,
  Hash,
  Loader2,
  Search,
  TrendingUp,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";
import { useActor } from "../hooks/useActor";
import {
  type Post,
  awardBadge,
  extractHashtags,
  getPosts,
} from "../services/featureService";
import type { AppUser } from "../types";

export function ExplorePage() {
  const { currentUser } = useAuth();
  const { users, followUser, unfollowUser, sendFollowRequest } = useChat();
  const { actor } = useActor();
  const navigate = useNavigate();
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AppUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [trendingHashtags, setTrendingHashtags] = useState<
    Array<{ tag: string; count: number }>
  >([]);
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>(
    {},
  );

  // Enable scrolling
  useEffect(() => {
    document.body.classList.add("page-subpage");
    document.getElementById("root")?.classList.add("page-subpage");
    return () => {
      document.body.classList.remove("page-subpage");
      document.getElementById("root")?.classList.remove("page-subpage");
    };
  }, []);

  // Award explorer badge
  useEffect(() => {
    if (!currentUser) return;
    const awarded = awardBadge(currentUser.uid, "explorer");
    if (awarded) {
      toast.success("🧭 Badge Earned: Explorer!");
    }
  }, [currentUser]);

  // Fetch all users
  useEffect(() => {
    if (!actor) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    actor
      .searchUsersByUsername("")
      .then((profiles) => {
        const appUsers: AppUser[] = profiles
          .filter((p) => p._id.toString() !== currentUser?.uid)
          .map((p) => ({
            uid: p._id.toString(),
            username: p.username,
            email: p.email || "",
            profilePicture: p.profilePicture || "",
            bio: p.bio || "",
            isPrivate: p.isPrivate,
            onlineStatus: p.onlineStatus,
            lastSeen:
              typeof p.lastSeen === "bigint"
                ? Number(p.lastSeen / BigInt(1_000_000))
                : Date.now(),
            blockedUsers: p.blockedUsers.map((b) => b.toString()),
            followers: p.followers.map((f) => f.toString()),
            following: p.following.map((f) => f.toString()),
            createdAt:
              typeof p.createdAt === "bigint"
                ? Number(p.createdAt / BigInt(1_000_000))
                : Date.now(),
          }));
        setAllUsers(appUsers);
        setFilteredUsers(appUsers);
      })
      .catch(() => {
        // fallback to cached users
        const cached = Object.values(users).filter(
          (u) => u.uid !== currentUser?.uid,
        );
        setAllUsers(cached);
        setFilteredUsers(cached);
      })
      .finally(() => setIsLoading(false));
  }, [actor, currentUser, users]);

  // Compute trending hashtags
  useEffect(() => {
    const posts = getPosts();
    const tagCounts: Record<string, number> = {};
    for (const post of posts) {
      for (const tag of post.hashtags) {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      }
    }
    const sorted = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    setTrendingHashtags(sorted);
  }, []);

  const handleSearch = useCallback(
    (q: string) => {
      setSearchQuery(q);
      if (!q.trim()) {
        setFilteredUsers(allUsers);
        return;
      }
      const lower = q.toLowerCase();
      setFilteredUsers(
        allUsers.filter(
          (u) =>
            u.username.toLowerCase().includes(lower) ||
            u.bio?.toLowerCase().includes(lower),
        ),
      );
    },
    [allUsers],
  );

  const handleHashtagClick = (tag: string) => {
    if (selectedHashtag === tag) {
      setSelectedHashtag(null);
      setFilteredPosts([]);
      return;
    }
    setSelectedHashtag(tag);
    const posts = getPosts();
    setFilteredPosts(posts.filter((p) => p.hashtags.includes(tag)));
  };

  const handleFollow = async (user: AppUser) => {
    if (!currentUser) return;
    setFollowLoading((prev) => ({ ...prev, [user.uid]: true }));
    try {
      if (user.isPrivate) {
        sendFollowRequest(user.uid, user.username);
        toast.success(`Follow request sent to @${user.username}`);
      } else {
        await followUser(user.uid);
        toast.success(`Following @${user.username}`);
        // Update local list
        setAllUsers((prev) =>
          prev.map((u) =>
            u.uid === user.uid
              ? { ...u, followers: [...u.followers, currentUser.uid] }
              : u,
          ),
        );
        setFilteredUsers((prev) =>
          prev.map((u) =>
            u.uid === user.uid
              ? { ...u, followers: [...u.followers, currentUser.uid] }
              : u,
          ),
        );
      }
    } catch {
      toast.error("Failed to follow");
    } finally {
      setFollowLoading((prev) => ({ ...prev, [user.uid]: false }));
    }
  };

  const handleUnfollow = async (user: AppUser) => {
    if (!currentUser) return;
    setFollowLoading((prev) => ({ ...prev, [user.uid]: true }));
    try {
      await unfollowUser(user.uid);
      toast.success(`Unfollowed @${user.username}`);
      setAllUsers((prev) =>
        prev.map((u) =>
          u.uid === user.uid
            ? {
                ...u,
                followers: u.followers.filter((f) => f !== currentUser.uid),
              }
            : u,
        ),
      );
      setFilteredUsers((prev) =>
        prev.map((u) =>
          u.uid === user.uid
            ? {
                ...u,
                followers: u.followers.filter((f) => f !== currentUser.uid),
              }
            : u,
        ),
      );
    } catch {
      toast.error("Failed to unfollow");
    } finally {
      setFollowLoading((prev) => ({ ...prev, [user.uid]: false }));
    }
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
        >
          <ArrowLeft size={18} />
        </Button>
        <div className="flex items-center gap-2">
          <Compass size={18} className="text-primary" />
          <h1
            className="font-bold text-lg tracking-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Explore
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-10">
        {/* Search */}
        <div className="pt-4 pb-3">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search people..."
              className="pl-9 rounded-xl bg-muted/50 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/40"
            />
          </div>
        </div>

        {/* Trending Hashtags */}
        {trendingHashtags.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={15} className="text-primary" />
              <h2 className="text-sm font-bold">Trending</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {trendingHashtags.map(({ tag, count }) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => handleHashtagClick(tag)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    selectedHashtag === tag
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-border/50 hover:bg-accent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Hash size={11} />
                  {tag.replace("#", "")}
                  <span className="opacity-60">{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filtered posts by hashtag */}
        {selectedHashtag && (
          <div className="mb-4 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Posts with {selectedHashtag}
            </h3>
            {filteredPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No posts with this hashtag yet
              </p>
            ) : (
              filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-card border border-border rounded-xl p-3"
                >
                  <p className="text-xs font-semibold text-primary mb-1">
                    @{post.authorUsername}
                  </p>
                  <p className="text-sm">
                    {post.text.slice(0, 120)}
                    {post.text.length > 120 ? "…" : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* People to follow */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <UserPlus size={15} className="text-primary" />
            <h2 className="text-sm font-bold">People</h2>
            {!isLoading && (
              <span className="text-xs text-muted-foreground ml-auto">
                {filteredUsers.length} users
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No users found</p>
            </div>
          ) : (
            <ScrollArea>
              <div className="space-y-1">
                {filteredUsers.map((user) => {
                  const isFollowing =
                    currentUser && user.followers.includes(currentUser.uid);
                  const loading = followLoading[user.uid];

                  return (
                    <div
                      key={user.uid}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors"
                    >
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarImage src={user.profilePicture} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                          {user.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold truncate">
                            @{user.username}
                          </p>
                          {user.isPrivate && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 h-4"
                            >
                              Private
                            </Badge>
                          )}
                          {user.onlineStatus && (
                            <span className="w-2 h-2 rounded-full bg-online-dot flex-shrink-0" />
                          )}
                        </div>
                        {user.bio && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {user.bio}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {user.followers.length} followers
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={isFollowing ? "outline" : "default"}
                        className={`h-8 px-3 rounded-xl text-xs flex-shrink-0 ${!isFollowing ? "gradient-btn" : ""}`}
                        onClick={() =>
                          isFollowing
                            ? handleUnfollow(user)
                            : handleFollow(user)
                        }
                        disabled={loading}
                      >
                        {loading ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : isFollowing ? (
                          <>
                            <UserCheck size={12} className="mr-1" />
                            Following
                          </>
                        ) : (
                          <>
                            <span className={!isFollowing ? "text-white" : ""}>
                              {user.isPrivate ? "Request" : "Follow"}
                            </span>
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
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
