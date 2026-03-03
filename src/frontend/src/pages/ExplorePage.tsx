import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Compass,
  Crown,
  Flame,
  Hash,
  Loader2,
  Medal,
  Radio,
  Search,
  TrendingUp,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Channel } from "../backend.d";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";
import { useActor } from "../hooks/useActor";
import {
  ALL_BADGES,
  type Post,
  awardBadge,
  getActivityStreak,
  getBadges,
  getMsgCount,
  getPosts,
} from "../services/featureService";
import type { AppUser } from "../types";

export function ExplorePage() {
  const { currentUser } = useAuth();
  const { openChat, setActiveChatId } = useChat();
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
  const [messagingUser, setMessagingUser] = useState<string | null>(null);

  // Channels state
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [joiningChannel, setJoiningChannel] = useState<string | null>(null);

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
        setAllUsers([]);
        setFilteredUsers([]);
      })
      .finally(() => setIsLoading(false));
  }, [actor, currentUser]);

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

  // Fetch public channels
  useEffect(() => {
    if (!actor) return;
    setIsLoadingChannels(true);
    actor
      .getChannels()
      .then((ch) => setChannels(ch))
      .catch(() => {})
      .finally(() => setIsLoadingChannels(false));
  }, [actor]);

  const handleJoinChannel = async (channelId: string) => {
    if (!actor) return;
    setJoiningChannel(channelId);
    try {
      await actor.joinChannel(channelId);
      setChannels((prev) =>
        prev.map((c) =>
          c.id === channelId
            ? {
                ...c,
                subscribers: [
                  ...c.subscribers,
                  {
                    toString: () => currentUser!.uid,
                  } as Channel["subscribers"][0],
                ],
              }
            : c,
        ),
      );
      toast.success("Joined channel!");
    } catch {
      toast.error("Failed to join channel");
    } finally {
      setJoiningChannel(null);
    }
  };

  const getChannelGradient = (name: string) => {
    const gradients = [
      "linear-gradient(135deg,#e1306c,#833ab4)",
      "linear-gradient(135deg,#1a73e8,#0d47a1)",
      "linear-gradient(135deg,#f46b45,#eea849)",
      "linear-gradient(135deg,#1a8a2e,#3ab54a)",
      "linear-gradient(135deg,#6c3483,#a569bd)",
      "linear-gradient(135deg,#00838f,#00bcd4)",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    }
    return gradients[Math.abs(hash) % gradients.length];
  };

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

  const handleMessageUser = async (user: AppUser) => {
    if (!currentUser) return;
    setMessagingUser(user.uid);
    try {
      const { chatId } = await openChat(currentUser.uid, user.uid, user);
      setActiveChatId(chatId);
      navigate({ to: "/" });
    } catch {
      toast.error("Failed to open chat");
    } finally {
      setMessagingUser(null);
    }
  };

  // Leaderboard data
  const leaderboard = [...allUsers]
    .map((u) => ({
      user: u,
      msgCount: getMsgCount(u.uid),
      streak: getActivityStreak(u.uid),
      badges: getBadges(u.uid),
    }))
    .sort((a, b) => b.msgCount - a.msgCount)
    .slice(0, 10);

  // Recommended friends: users with mutual followers
  // Suggested users: all other registered users (no follow system)
  const forYouUsers = allUsers.slice(0, 10);

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Crown size={14} className="text-yellow-400" />;
    if (rank === 1) return <Medal size={14} className="text-slate-400" />;
    if (rank === 2) return <Medal size={14} className="text-amber-600" />;
    return (
      <span className="text-xs font-bold text-muted-foreground w-3.5 text-center">
        {rank + 1}
      </span>
    );
  };

  const UserCard = ({ user }: { user: AppUser }) => {
    const loading = messagingUser === user.uid;
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors">
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarImage src={user.profilePicture} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
            {user.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold truncate">@{user.username}</p>
            {user.onlineStatus && (
              <span className="w-2 h-2 rounded-full bg-online-dot flex-shrink-0" />
            )}
          </div>
          {user.bio && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {user.bio}
            </p>
          )}
        </div>
        <Button
          size="sm"
          className="h-8 px-3 rounded-xl text-xs flex-shrink-0 gradient-btn"
          onClick={() => handleMessageUser(user)}
          disabled={loading}
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <span className="text-white">Message</span>
          )}
        </Button>
      </div>
    );
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

        {/* Tabs */}
        <Tabs defaultValue="discover">
          <TabsList className="w-full rounded-xl mb-4 bg-muted/50 flex">
            <TabsTrigger value="discover" className="flex-1 rounded-lg text-xs">
              <Compass size={13} className="mr-1" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="for-you" className="flex-1 rounded-lg text-xs">
              <UserPlus size={13} className="mr-1" />
              For You
            </TabsTrigger>
            <TabsTrigger
              value="channels"
              className="flex-1 rounded-lg text-xs"
              data-ocid="explore.channels.tab"
            >
              <Radio size={13} className="mr-1" />
              Channels
            </TabsTrigger>
            <TabsTrigger
              value="leaderboard"
              className="flex-1 rounded-lg text-xs"
            >
              <Trophy size={13} className="mr-1" />
              Top
            </TabsTrigger>
          </TabsList>

          {/* Discover tab */}
          <TabsContent value="discover">
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

            {/* People section */}
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
                  <p className="text-sm text-muted-foreground">
                    No users found
                  </p>
                </div>
              ) : (
                <ScrollArea>
                  <div className="space-y-1">
                    {filteredUsers.map((user) => (
                      <UserCard key={user.uid} user={user} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>

          {/* For You tab */}
          <TabsContent value="for-you">
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus size={15} className="text-primary" />
                <h2 className="text-sm font-bold">Recommended for You</h2>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={20} className="animate-spin text-primary" />
                </div>
              ) : forYouUsers.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-muted-foreground">
                    No recommendations yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Follow more people to get personalized suggestions
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {forYouUsers.map((user) => (
                    <UserCard key={user.uid} user={user} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Channels tab */}
          <TabsContent value="channels">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Radio size={15} className="text-primary" />
                <h2 className="text-sm font-bold">Public Channels</h2>
                {!isLoadingChannels && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {channels.length} channels
                  </span>
                )}
              </div>

              {isLoadingChannels ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-primary" />
                </div>
              ) : channels.length === 0 ? (
                <div
                  className="text-center py-12"
                  data-ocid="explore.channels.empty_state"
                >
                  <Radio
                    size={28}
                    className="mx-auto mb-3 text-muted-foreground/40"
                  />
                  <p className="text-sm text-muted-foreground">
                    No channels yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create a channel from the Channels page
                  </p>
                </div>
              ) : (
                <div className="space-y-2" data-ocid="explore.channels.list">
                  {channels.map((channel, idx) => {
                    const isJoined = channel.subscribers.some(
                      (s) => s.toString() === currentUser?.uid,
                    );
                    return (
                      <div
                        key={channel.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card/50 hover:bg-accent/30 transition-colors"
                        data-ocid={`explore.channels.item.${idx + 1}`}
                      >
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                          style={{
                            background: getChannelGradient(channel.name),
                          }}
                        >
                          <span className="text-white font-bold text-sm">
                            {channel.name.slice(0, 1).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {channel.name}
                          </p>
                          {channel.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {channel.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Users size={9} />
                              {channel.subscribers.length}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={isJoined ? "outline" : "default"}
                          className={`h-8 px-3 rounded-xl text-xs flex-shrink-0 ${!isJoined ? "gradient-btn" : ""}`}
                          disabled={joiningChannel === channel.id}
                          onClick={() =>
                            !isJoined && handleJoinChannel(channel.id)
                          }
                          data-ocid={`explore.channels.button.${idx + 1}`}
                        >
                          {joiningChannel === channel.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : isJoined ? (
                            "Joined"
                          ) : (
                            <span className="text-white">Join</span>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Leaderboard tab */}
          <TabsContent value="leaderboard">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={15} className="text-primary" />
                <h2 className="text-sm font-bold">Top Users</h2>
                <span className="text-xs text-muted-foreground ml-auto">
                  by messages
                </span>
              </div>
              {leaderboard.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-muted-foreground">
                    No leaderboard data yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map(
                    ({ user, msgCount, streak, badges }, idx) => (
                      <div
                        key={user.uid}
                        className={`flex items-center gap-3 p-3 rounded-xl border ${
                          idx === 0
                            ? "bg-yellow-500/5 border-yellow-400/30"
                            : idx === 1
                              ? "bg-slate-400/5 border-slate-400/20"
                              : idx === 2
                                ? "bg-amber-600/5 border-amber-600/20"
                                : "border-border/50 bg-card/50"
                        }`}
                      >
                        <div className="w-6 flex items-center justify-center flex-shrink-0">
                          {getRankIcon(idx)}
                        </div>
                        <Avatar className="w-9 h-9 flex-shrink-0">
                          <AvatarImage src={user.profilePicture} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {user.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold truncate">
                              @{user.username}
                            </p>
                            {badges.slice(0, 2).map((b) => {
                              const info = ALL_BADGES.find((x) => x.id === b);
                              return info ? (
                                <span
                                  key={b}
                                  title={info.name}
                                  className="text-sm"
                                >
                                  {info.icon}
                                </span>
                              ) : null;
                            })}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {msgCount} msgs
                            </span>
                            {streak > 0 && (
                              <span className="flex items-center gap-0.5 text-xs text-orange-500">
                                <Flame size={10} />
                                {streak}d streak
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
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
