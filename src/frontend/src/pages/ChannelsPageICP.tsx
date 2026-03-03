import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Copy,
  Edit2,
  Hash,
  Link,
  Loader2,
  MoreHorizontal,
  Pin,
  Plus,
  Radio,
  Search,
  Send,
  Settings,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Channel, Message } from "../backend.d";
import { useAuth } from "../contexts/AuthContext";
import { useActor } from "../hooks/useActor";

// ─── Color helpers ─────────────────────────────────────────────────────────────

function getChannelGradient(name: string): string {
  const gradients = [
    "linear-gradient(135deg,#e1306c,#833ab4)",
    "linear-gradient(135deg,#1a73e8,#0d47a1)",
    "linear-gradient(135deg,#f46b45,#eea849)",
    "linear-gradient(135deg,#1a8a2e,#3ab54a)",
    "linear-gradient(135deg,#6c3483,#a569bd)",
    "linear-gradient(135deg,#00838f,#00bcd4)",
    "linear-gradient(135deg,#b71c1c,#e53935)",
    "linear-gradient(135deg,#f57f17,#ffca28)",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return gradients[Math.abs(hash) % gradients.length];
}

function formatTime(createdAt: bigint | number): string {
  const ts =
    typeof createdAt === "bigint" ? Number(createdAt / 1_000_000n) : createdAt;
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return new Date(ts).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function ChannelsPageICP() {
  const { currentUser } = useAuth();
  const { actor } = useActor();
  const navigate = useNavigate();
  const uid = currentUser!.uid;

  const [activeTab, setActiveTab] = useState<"discover" | "my" | "trending">(
    "discover",
  );
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [myChannels, setMyChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [channelMessages, setChannelMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Create channel form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newRules, setNewRules] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Channel settings
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editRules, setEditRules] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Post area
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMsgTsRef = useRef<bigint>(0n);

  // Enable scrolling on sub-page
  useEffect(() => {
    document.body.classList.add("page-subpage");
    document.getElementById("root")?.classList.add("page-subpage");
    return () => {
      document.body.classList.remove("page-subpage");
      document.getElementById("root")?.classList.remove("page-subpage");
    };
  }, []);

  const loadChannels = useCallback(async () => {
    if (!actor) return;
    try {
      const [all, my] = await Promise.all([
        actor.getChannels(),
        actor.getMyChannels(),
      ]);
      setAllChannels(all);
      setMyChannels(my);
    } catch {
      // silently fail
    }
  }, [actor]);

  useEffect(() => {
    setIsLoading(true);
    loadChannels().finally(() => setIsLoading(false));
  }, [loadChannels]);

  // Poll messages for active channel
  const fetchChannelMessages = useCallback(
    async (channelId: string, after = 0n) => {
      if (!actor) return;
      try {
        const msgs = await actor.getChannelMessages(channelId, after);
        if (msgs.length === 0) return;
        setChannelMessages((prev) => {
          if (after === 0n) return msgs;
          const existingIds = new Set(
            prev.map((m) => `${m.senderId}_${m.createdAt}`),
          );
          const newMsgs = msgs.filter(
            (m) => !existingIds.has(`${m.senderId}_${m.createdAt}`),
          );
          return [...prev, ...newMsgs];
        });
        const latest = msgs.reduce(
          (max, m) => (m.createdAt > max ? m.createdAt : max),
          after,
        );
        lastMsgTsRef.current = latest;
      } catch {}
    },
    [actor],
  );

  useEffect(() => {
    if (!activeChannel) return;
    lastMsgTsRef.current = 0n;
    setChannelMessages([]);
    fetchChannelMessages(activeChannel.id, 0n);

    pollRef.current = setInterval(() => {
      fetchChannelMessages(activeChannel.id, lastMsgTsRef.current);
    }, 500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeChannel, fetchChannelMessages]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: length is intentional
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [channelMessages.length]);

  const handleJoin = async (channelId: string) => {
    if (!actor) return;
    try {
      await actor.joinChannel(channelId);
      toast.success("Joined channel!");
      await loadChannels();
    } catch {
      toast.error("Failed to join");
    }
  };

  const handleLeave = async (channelId: string) => {
    if (!actor) return;
    try {
      await actor.leaveChannel(channelId);
      toast.success("Left channel");
      setActiveChannel(null);
      await loadChannels();
    } catch {
      toast.error("Failed to leave");
    }
  };

  const handleCreate = async () => {
    if (!actor || !newName.trim()) return;
    setIsCreating(true);
    try {
      const channelId = await actor.createChannel(
        newName.trim(),
        newDesc.trim(),
        newRules.trim(),
        isPublic,
      );
      toast.success("Channel created!");
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      setNewRules("");
      await loadChannels();
      // Auto-join
      try {
        const ch = await actor.getChannelById(channelId);
        if (ch) {
          setActiveChannel(ch);
          setActiveTab("my");
        }
      } catch {}
    } catch {
      toast.error("Failed to create channel");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSend = async () => {
    if (!actor || !activeChannel || !inputText.trim()) return;
    setIsSending(true);
    try {
      await actor.postToChannel(activeChannel.id, inputText.trim(), "", "text");
      setInputText("");
      // Immediately refresh messages
      await fetchChannelMessages(activeChannel.id, 0n);
    } catch {
      toast.error("Only channel admins can post");
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerateInviteLink = async () => {
    if (!actor || !activeChannel) return;
    try {
      const link = await actor.generateChannelInviteLink(activeChannel.id);
      setInviteLink(link);
    } catch {
      toast.error("Only admins can generate invite links");
    }
  };

  const handleCopyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(
      `${window.location.origin}/join/channel/${inviteLink}`,
    );
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast.success("Link copied!");
  };

  const handlePinMessage = async (messageId: string) => {
    if (!actor || !activeChannel) return;
    try {
      await actor.pinMessageInChannel(activeChannel.id, messageId);
      toast.success("Message pinned");
      const updated = await actor.getChannelById(activeChannel.id);
      if (updated) setActiveChannel(updated);
    } catch {
      toast.error("Only admins can pin messages");
    }
  };

  const handleSaveSettings = async () => {
    if (!actor || !activeChannel) return;
    setIsSavingSettings(true);
    try {
      await actor.updateChannelInfo(
        activeChannel.id,
        editName,
        editDesc,
        editRules,
      );
      toast.success("Channel updated!");
      const updated = await actor.getChannelById(activeChannel.id);
      if (updated) setActiveChannel(updated);
      setShowSettings(false);
      await loadChannels();
    } catch {
      toast.error("Only admins can update channel info");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const isAdmin = (channel: Channel) => channel.adminId.toString() === uid;

  const isSubscribed = (channel: Channel) =>
    channel.subscribers.some((s) => s.toString() === uid);

  // Filter channels
  const discoveryList = allChannels.filter(
    (c) =>
      c.isPublic &&
      (!searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const trendingList = [...allChannels]
    .filter((c) => c.isPublic)
    .sort((a, b) => b.subscribers.length - a.subscribers.length)
    .slice(0, 20);

  const getTabList = () => {
    if (activeTab === "my") return myChannels;
    if (activeTab === "trending") return trendingList;
    return discoveryList;
  };

  return (
    <div className="min-h-dvh bg-background page-fade flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl w-9 h-9"
          onClick={() => navigate({ to: "/" })}
          data-ocid="channels.back.button"
        >
          <ArrowLeft size={18} />
        </Button>
        <div className="flex items-center gap-2 flex-1">
          <Radio size={18} className="text-primary" />
          <h1
            className="font-bold text-lg tracking-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Channels
          </h1>
        </div>
        <Button
          size="sm"
          className="gradient-btn rounded-xl gap-1.5 h-8 px-3"
          onClick={() => setShowCreate(true)}
          data-ocid="channels.create.open_modal_button"
        >
          <Plus size={13} className="text-white" />
          <span className="text-white text-xs font-semibold">Create</span>
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — channel list */}
        <div
          className={`w-full md:w-[320px] flex-shrink-0 border-r border-border flex flex-col ${
            activeChannel ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Tabs */}
          <div className="flex border-b border-border px-2 pt-2">
            {(["discover", "my", "trending"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTab(t)}
                className={`flex-1 py-2 text-xs font-semibold rounded-t-lg capitalize transition-colors ${
                  activeTab === t
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-ocid={`channels.${t}.tab`}
              >
                {t === "discover" && <Hash size={12} className="inline mr-1" />}
                {t === "my" && <Users size={12} className="inline mr-1" />}
                {t === "trending" && (
                  <TrendingUp size={12} className="inline mr-1" />
                )}
                {t}
              </button>
            ))}
          </div>

          {/* Search (discover tab) */}
          {activeTab === "discover" && (
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search channels..."
                  className="pl-8 h-9 rounded-xl text-sm"
                  data-ocid="channels.search_input"
                />
              </div>
            </div>
          )}

          {/* Channel list */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={20} className="animate-spin text-primary" />
              </div>
            ) : getTabList().length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16 gap-3 px-6"
                data-ocid="channels.empty_state"
              >
                <Radio
                  size={28}
                  className="text-muted-foreground/50"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-muted-foreground text-center">
                  {activeTab === "my"
                    ? "You haven't joined any channels yet."
                    : "No channels found."}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setShowCreate(true)}
                >
                  Create one
                </Button>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {getTabList().map((channel, idx) => {
                  const subscribed = isSubscribed(channel);
                  const admin = isAdmin(channel);

                  return (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => {
                        if (subscribed || admin) {
                          setActiveChannel(channel);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-colors ${
                        activeChannel?.id === channel.id
                          ? "bg-primary/10"
                          : "hover:bg-accent"
                      }`}
                      data-ocid={`channels.item.${idx + 1}`}
                    >
                      {/* Icon */}
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                        style={{ background: getChannelGradient(channel.name) }}
                      >
                        {channel.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold truncate">
                            {channel.name}
                          </p>
                          {admin && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] px-1 py-0 h-4 flex-shrink-0"
                            >
                              Admin
                            </Badge>
                          )}
                          {!channel.isPublic && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 h-4 flex-shrink-0"
                            >
                              Private
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {channel.description || "No description"}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Users size={10} />
                          {channel.subscribers.length}
                        </span>
                        {!subscribed && !admin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoin(channel.id);
                            }}
                            className="text-[10px] font-semibold text-primary hover:underline"
                            data-ocid={`channels.join.button.${idx + 1}`}
                          >
                            Join
                          </button>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right panel — channel view */}
        {activeChannel ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Channel header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden w-9 h-9 rounded-xl"
                onClick={() => setActiveChannel(null)}
                data-ocid="channels.back_to_list.button"
              >
                <ArrowLeft size={18} />
              </Button>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: getChannelGradient(activeChannel.name) }}
              >
                {activeChannel.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">
                    {activeChannel.name}
                  </p>
                  {isAdmin(activeChannel) && (
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1.5 h-4"
                    >
                      Admin
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeChannel.subscribers.length} subscribers
                </p>
              </div>

              <div className="flex items-center gap-1">
                {isAdmin(activeChannel) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-9 h-9 rounded-xl"
                    onClick={() => {
                      setEditName(activeChannel.name);
                      setEditDesc(activeChannel.description);
                      setEditRules(activeChannel.rules);
                      setShowSettings(true);
                    }}
                    data-ocid="channels.settings.open_modal_button"
                  >
                    <Settings size={16} />
                  </Button>
                )}
                {!isAdmin(activeChannel) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs rounded-xl text-destructive hover:text-destructive"
                    onClick={() => handleLeave(activeChannel.id)}
                    data-ocid="channels.leave.button"
                  >
                    Leave
                  </Button>
                )}
              </div>
            </div>

            {/* Pinned message */}
            {activeChannel.pinnedMessageId &&
              channelMessages.length > 0 &&
              (() => {
                const pinned = channelMessages.find(
                  (m) =>
                    `${m.senderId}_${m.createdAt}` ===
                      activeChannel.pinnedMessageId || m.text.length > 0,
                );
                return pinned ? (
                  <div className="px-4 py-2 bg-primary/5 border-b border-primary/20 flex items-start gap-2">
                    <Pin
                      size={12}
                      className="text-primary mt-0.5 flex-shrink-0"
                    />
                    <p className="text-xs text-primary/80 truncate">
                      {pinned.text}
                    </p>
                  </div>
                ) : null;
              })()}

            {/* Channel info */}
            {activeChannel.description && (
              <div className="px-4 py-2 bg-muted/20 border-b border-border">
                <p className="text-xs text-muted-foreground">
                  {activeChannel.description}
                </p>
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {channelMessages.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center h-full gap-3 py-20"
                  data-ocid="channels.messages.empty_state"
                >
                  <Radio
                    size={28}
                    className="text-muted-foreground/50"
                    strokeWidth={1.5}
                  />
                  <p className="text-sm text-muted-foreground">
                    {isAdmin(activeChannel)
                      ? "Start broadcasting to your subscribers"
                      : "No posts yet. Follow this channel for updates."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {channelMessages.map((msg, idx) => (
                    <ChannelMessageItem
                      key={`${msg.senderId}_${msg.createdAt}`}
                      message={msg}
                      idx={idx}
                      isAdmin={isAdmin(activeChannel)}
                      onPin={() =>
                        handlePinMessage(`${msg.senderId}_${msg.createdAt}`)
                      }
                    />
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Post area — admin only */}
            {isAdmin(activeChannel) ? (
              <div className="p-3 border-t border-border bg-background">
                <div className="flex items-end gap-2">
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Post to your channel..."
                    className="flex-1 min-h-[52px] max-h-[120px] resize-none rounded-xl text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.ctrlKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    data-ocid="channels.post.textarea"
                  />
                  <Button
                    size="icon"
                    className="gradient-btn rounded-xl w-10 h-10 flex-shrink-0"
                    onClick={handleSend}
                    disabled={!inputText.trim() || isSending}
                    data-ocid="channels.post.submit_button"
                  >
                    {isSending ? (
                      <Loader2 size={15} className="text-white animate-spin" />
                    ) : (
                      <Send size={15} className="text-white" />
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Ctrl + Enter to post
                </p>
              </div>
            ) : (
              <div className="p-3 border-t border-border bg-background/60 text-center">
                <p className="text-xs text-muted-foreground">
                  Only the channel admin can post
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center flex-col gap-4 text-center px-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "oklch(var(--muted))" }}
            >
              <Radio
                size={28}
                className="text-muted-foreground/50"
                strokeWidth={1.5}
              />
            </div>
            <div>
              <p className="font-semibold">Select a channel</p>
              <p className="text-sm text-muted-foreground mt-1">
                Join a channel or create your own broadcast
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create Channel Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card rounded-3xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3
                className="font-bold text-base"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Create Channel
              </h3>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                style={{ background: getChannelGradient(newName || "?") }}
              >
                {newName.charAt(0).toUpperCase() || "?"}
              </div>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Channel name *"
                className="rounded-xl flex-1"
                data-ocid="channels.create.name_input"
              />
            </div>

            <Textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className="rounded-xl resize-none"
              rows={2}
              data-ocid="channels.create.description_textarea"
            />

            <Textarea
              value={newRules}
              onChange={(e) => setNewRules(e.target.value)}
              placeholder="Channel rules (optional)"
              className="rounded-xl resize-none"
              rows={2}
            />

            <button
              type="button"
              className="flex items-center gap-3 cursor-pointer w-full text-left"
              onClick={() => setIsPublic(!isPublic)}
            >
              <div
                aria-checked={isPublic}
                className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                  isPublic ? "bg-primary" : "bg-border"
                } relative`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                    isPublic ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </div>
              <span className="text-sm">
                {isPublic ? "Public channel" : "Private channel"}
              </span>
            </button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setShowCreate(false)}
                data-ocid="channels.create.cancel_button"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gradient-btn rounded-xl text-white"
                onClick={handleCreate}
                disabled={!newName.trim() || isCreating}
                data-ocid="channels.create.submit_button"
              >
                {isCreating ? (
                  <Loader2 size={14} className="animate-spin mr-2" />
                ) : null}
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Channel Settings Modal */}
      {showSettings && activeChannel && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card rounded-3xl border border-border p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3
                className="font-bold text-base"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Channel Settings
              </h3>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                  Name
                </p>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded-xl"
                  data-ocid="channels.settings.name_input"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                  Description
                </p>
                <Textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="rounded-xl resize-none"
                  rows={2}
                  data-ocid="channels.settings.description_textarea"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                  Rules
                </p>
                <Textarea
                  value={editRules}
                  onChange={(e) => setEditRules(e.target.value)}
                  className="rounded-xl resize-none"
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Invite link */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Invite Link
              </p>
              {inviteLink ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted rounded-lg px-3 py-2 truncate">
                    {`.../${inviteLink}`}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    className="w-9 h-9 rounded-xl flex-shrink-0"
                    onClick={handleCopyLink}
                    data-ocid="channels.settings.copy_link.button"
                  >
                    {copiedLink ? (
                      <Check size={14} className="text-green-500" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-2"
                  onClick={handleGenerateInviteLink}
                  data-ocid="channels.settings.generate_link.button"
                >
                  <Link size={13} />
                  Generate Invite Link
                </Button>
              )}
            </div>

            <Separator />

            {/* Subscribers */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Subscribers ({activeChannel.subscribers.length})
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {activeChannel.subscribers.slice(0, 10).map((s) => (
                  <div
                    key={s.toString()}
                    className="flex items-center gap-2 py-1"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {s.toString().slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {s.toString().slice(0, 14)}…
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setShowSettings(false)}
                data-ocid="channels.settings.cancel_button"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gradient-btn rounded-xl text-white"
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                data-ocid="channels.settings.save_button"
              >
                {isSavingSettings ? (
                  <Loader2 size={14} className="animate-spin mr-2" />
                ) : null}
                Save
              </Button>
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

// ─── Channel Message Item ──────────────────────────────────────────────────────

function ChannelMessageItem({
  message,
  idx,
  isAdmin,
  onPin,
}: {
  message: Message;
  idx: number;
  isAdmin: boolean;
  onPin: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const ts =
    typeof message.createdAt === "bigint"
      ? Number(message.createdAt / 1_000_000n)
      : message.createdAt;

  return (
    <div
      className="bg-card border border-border rounded-2xl p-4 group relative"
      data-ocid={`channels.message.item.${idx + 1}`}
    >
      {/* Admin actions */}
      {isAdmin && (
        <button
          type="button"
          onClick={() => setShowMenu(!showMenu)}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-muted/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
        >
          <MoreHorizontal size={13} />
        </button>
      )}

      {showMenu && (
        <div className="absolute top-10 right-3 z-20 bg-card border border-border rounded-xl py-1 shadow-lg min-w-[130px]">
          <button
            type="button"
            className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-accent transition-colors"
            onClick={() => {
              onPin();
              setShowMenu(false);
            }}
          >
            <Pin size={12} />
            Pin Message
          </button>
        </div>
      )}

      {/* Message header */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px]"
          style={{ background: "oklch(0.62 0.27 345)" }}
        >
          {message.senderId.toString().slice(0, 2).toUpperCase()}
        </div>
        <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
          Channel
        </Badge>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {formatTime(ts)}
        </span>
      </div>

      <Separator className="mb-3" />

      {/* Content */}
      {message.mediaUrl && (
        <img
          src={message.mediaUrl}
          alt="Post media"
          className="w-full rounded-xl mb-3 max-h-64 object-cover"
          loading="lazy"
        />
      )}
      <p className="text-sm leading-relaxed">{message.text}</p>
    </div>
  );
}
