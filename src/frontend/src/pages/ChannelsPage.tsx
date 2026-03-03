import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Hash,
  MessageCircle,
  Plus,
  Radio,
  Search,
  Send,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import {
  type PublicRoom,
  type RoomMessage,
  addRoomMessage,
  createRoom,
  getRoomMessages,
  getRooms,
  joinRoom,
  leaveRoom,
} from "../services/featureService";

// ─── Mute helpers ─────────────────────────────────────────────────────────────

function getMutedChannels(uid: string): Set<string> {
  try {
    const raw = localStorage.getItem(`linkr_muted_channels_${uid}`);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function toggleMuteChannel(uid: string, channelId: string): Set<string> {
  const set = getMutedChannels(uid);
  if (set.has(channelId)) set.delete(channelId);
  else set.add(channelId);
  localStorage.setItem(`linkr_muted_channels_${uid}`, JSON.stringify([...set]));
  return set;
}

// ─── Avatar gradient helper ───────────────────────────────────────────────────
function getChannelGradient(name: string): string {
  const colors = [
    "from-pink-500 to-violet-600",
    "from-blue-500 to-cyan-500",
    "from-orange-500 to-pink-500",
    "from-green-500 to-teal-500",
    "from-purple-600 to-pink-500",
    "from-yellow-500 to-orange-500",
    "from-cyan-500 to-blue-600",
    "from-rose-500 to-red-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return colors[hash % colors.length];
}

export function ChannelsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const uid = currentUser!.uid;

  const [channels, setChannels] = useState<PublicRoom[]>(() => getRooms());
  const [activeChannel, setActiveChannel] = useState<PublicRoom | null>(null);
  const [channelMessages, setChannelMessages] = useState<RoomMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [mutedChannels, setMutedChannels] = useState<Set<string>>(() =>
    getMutedChannels(uid),
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Enable scrolling
  useEffect(() => {
    document.body.classList.add("page-subpage");
    document.getElementById("root")?.classList.add("page-subpage");
    return () => {
      document.body.classList.remove("page-subpage");
      document.getElementById("root")?.classList.remove("page-subpage");
    };
  }, []);

  // Poll for new messages when a channel is open
  useEffect(() => {
    if (!activeChannel) return;
    setChannelMessages(getRoomMessages(activeChannel.id));

    pollRef.current = setInterval(() => {
      setChannelMessages(getRoomMessages(activeChannel.id));
      // Also refresh channel list to get latest subscriber counts
      setChannels(getRooms());
    }, 1000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeChannel]);

  // Scroll to bottom on new messages
  // biome-ignore lint/correctness/useExhaustiveDependencies: length is intentional
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [channelMessages.length]);

  const filteredChannels = searchQuery
    ? channels.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.topic.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : channels;

  const handleCreateChannel = () => {
    if (!newName.trim()) return;
    const channel = createRoom(
      newName.trim(),
      newDesc.trim(),
      newTopic.trim() || "General",
      uid,
      currentUser!.username,
    );
    setChannels(getRooms());
    setShowCreateModal(false);
    setNewName("");
    setNewDesc("");
    setNewTopic("");
    setActiveChannel(channel);
    toast.success("Channel created!");
  };

  const handleJoinLeave = (channel: PublicRoom) => {
    const isMember = channel.members.includes(uid);
    if (isMember) {
      leaveRoom(channel.id, uid);
    } else {
      joinRoom(channel.id, uid);
    }
    setChannels(getRooms());
    // Update active channel
    if (activeChannel?.id === channel.id) {
      setActiveChannel(getRooms().find((c) => c.id === channel.id) ?? null);
    }
  };

  const handleSend = () => {
    if (!inputText.trim() || !activeChannel) return;
    const isOwner = activeChannel.creatorId === uid;
    if (!isOwner) {
      toast.error("Only the channel owner can post");
      return;
    }
    addRoomMessage(
      activeChannel.id,
      uid,
      currentUser!.username,
      inputText.trim(),
    );
    setChannelMessages(getRoomMessages(activeChannel.id));
    setInputText("");
  };

  const handleMuteToggle = (channelId: string) => {
    const updated = toggleMuteChannel(uid, channelId);
    setMutedChannels(new Set(updated));
    toast.success(updated.has(channelId) ? "Channel muted" : "Channel unmuted");
  };

  const isOwner = (channel: PublicRoom) => channel.creatorId === uid;
  const isMember = (channel: PublicRoom) => channel.members.includes(uid);

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden">
      {/* ── Top Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm flex-shrink-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl w-9 h-9 flex-shrink-0"
          onClick={() => navigate({ to: "/" })}
          data-ocid="channels.back.button"
        >
          <ArrowLeft size={18} />
        </Button>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl gradient-btn flex items-center justify-center flex-shrink-0">
            <Radio size={15} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1
              className="font-bold text-base tracking-tight leading-none"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Channels
            </h1>
            <p className="text-[10px] text-muted-foreground">
              {channels.length} channel{channels.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="gradient-btn rounded-xl gap-1.5 h-8 px-3 flex-shrink-0"
          onClick={() => setShowCreateModal(true)}
          data-ocid="channels.create.open_modal_button"
        >
          <Plus size={13} className="text-white" />
          <span className="text-white text-xs font-semibold hidden sm:inline">
            Create
          </span>
          <span className="text-white text-xs font-semibold sm:hidden">+</span>
        </Button>
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Channel list */}
        <div
          className={cn(
            "flex flex-col border-r border-border bg-sidebar/30 flex-shrink-0",
            "w-full md:w-[280px] lg:w-[300px]",
            activeChannel ? "hidden md:flex" : "flex",
          )}
        >
          {/* Search bar */}
          <div className="p-3 border-b border-border/50">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search channels..."
                className="pl-8 h-8 rounded-xl text-sm bg-muted/60 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/40"
                data-ocid="channels.search_input"
              />
            </div>
          </div>

          {/* Channel list */}
          <ScrollArea className="flex-1">
            {filteredChannels.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center"
                data-ocid="channels.empty_state"
              >
                <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
                  <Hash
                    size={24}
                    className="text-muted-foreground/40"
                    strokeWidth={1.5}
                  />
                </div>
                <p className="text-sm font-medium">No channels yet</p>
                <p className="text-xs text-muted-foreground">
                  Create one to get started
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {filteredChannels.map((channel, idx) => {
                  const member = isMember(channel);
                  const owner = isOwner(channel);
                  const muted = mutedChannels.has(channel.id);
                  const isActive = activeChannel?.id === channel.id;
                  const gradient = getChannelGradient(channel.name);

                  return (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => {
                        if (member || owner) {
                          setActiveChannel(channel);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-100",
                        isActive
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-accent/70 border border-transparent",
                      )}
                      data-ocid={`channels.item.${idx + 1}`}
                    >
                      {/* Channel icon with gradient */}
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br",
                          gradient,
                        )}
                      >
                        <Hash size={17} className="text-white" />
                      </div>

                      {/* Channel info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p
                            className={cn(
                              "text-sm font-semibold truncate",
                              isActive ? "text-primary" : "",
                            )}
                          >
                            {channel.name}
                          </p>
                          {owner && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] px-1.5 py-0 h-4 flex-shrink-0 font-semibold"
                            >
                              Owner
                            </Badge>
                          )}
                          {muted && (
                            <BellOff
                              size={10}
                              className="text-muted-foreground flex-shrink-0"
                            />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {channel.topic}
                        </p>
                      </div>

                      {/* Right side: members + join/leave */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Users size={9} />
                          {channel.members.length}
                        </span>
                        {!member && !owner ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoinLeave(channel);
                            }}
                            className="text-[10px] font-semibold text-primary hover:underline px-1.5 py-0.5 rounded-full hover:bg-primary/10 transition-colors"
                            data-ocid={`channels.join.button.${idx + 1}`}
                          >
                            Join
                          </button>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right: Channel content */}
        {activeChannel ? (
          <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
            {/* Channel header */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-background/95 backdrop-blur-sm flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden w-9 h-9 rounded-xl flex-shrink-0"
                onClick={() => setActiveChannel(null)}
                data-ocid="channels.back_channel.button"
              >
                <ArrowLeft size={18} />
              </Button>

              {/* Channel icon */}
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br",
                  getChannelGradient(activeChannel.name),
                )}
              >
                <Hash size={15} className="text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">
                    {activeChannel.name}
                  </p>
                  {isOwner(activeChannel) && (
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1.5 py-0 h-4 flex-shrink-0"
                    >
                      Your Channel
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users size={9} />
                    {activeChannel.members.length} subscriber
                    {activeChannel.members.length !== 1 ? "s" : ""}
                    {activeChannel.topic && (
                      <span className="opacity-60">
                        · {activeChannel.topic}
                      </span>
                    )}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 rounded-xl"
                  onClick={() => handleMuteToggle(activeChannel.id)}
                  title={
                    mutedChannels.has(activeChannel.id) ? "Unmute" : "Mute"
                  }
                  data-ocid="channels.mute.toggle"
                >
                  {mutedChannels.has(activeChannel.id) ? (
                    <BellOff size={16} className="text-muted-foreground" />
                  ) : (
                    <Bell size={16} className="text-muted-foreground" />
                  )}
                </Button>
                {!isOwner(activeChannel) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      handleJoinLeave(activeChannel);
                      setActiveChannel(null);
                    }}
                    data-ocid="channels.leave.button"
                  >
                    Leave
                  </Button>
                )}
              </div>
            </div>

            {/* Channel description banner */}
            {activeChannel.description && (
              <div className="px-4 py-2 bg-muted/30 border-b border-border/50 flex-shrink-0">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {activeChannel.description}
                </p>
              </div>
            )}

            {/* Messages — broadcast post cards */}
            <div className="flex-1 overflow-y-auto chat-scroll">
              <div className="max-w-2xl mx-auto px-4 py-4">
                {channelMessages.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center py-20 gap-4 text-center"
                    data-ocid="channels.messages.empty_state"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                      <Radio
                        size={26}
                        className="text-muted-foreground/40"
                        strokeWidth={1.5}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">No posts yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isOwner(activeChannel)
                          ? "Start broadcasting to your subscribers"
                          : "The channel owner hasn't posted anything yet"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {channelMessages.map((msg, idx) => (
                      <div
                        key={msg.id}
                        className="group"
                        data-ocid={`channels.message.item.${idx + 1}`}
                      >
                        {/* Broadcast post card */}
                        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                          {/* Post header */}
                          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
                            <div
                              className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br",
                                getChannelGradient(activeChannel.name),
                              )}
                            >
                              <Hash size={14} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold truncate">
                                  {activeChannel.name}
                                </p>
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] px-1.5 h-4 flex-shrink-0"
                                >
                                  Channel
                                </Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                @{msg.authorUsername} ·{" "}
                                {formatRelativeTime(msg.createdAt)}
                              </p>
                            </div>
                          </div>

                          {/* Post body */}
                          <div className="px-4 py-3">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {msg.text}
                            </p>
                          </div>

                          {/* Post footer */}
                          <div className="flex items-center gap-4 px-4 pb-3 pt-1">
                            <button
                              type="button"
                              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-xs"
                            >
                              <MessageCircle size={13} />
                              <span>View in channel</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Post area — only for channel owner */}
            {isOwner(activeChannel) ? (
              <div className="p-3 border-t border-border bg-background flex-shrink-0">
                <div className="flex items-end gap-2 max-w-2xl mx-auto">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 self-end mb-0.5 bg-gradient-to-br",
                      getChannelGradient(activeChannel.name),
                    )}
                  >
                    <Hash size={13} className="text-white" />
                  </div>
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Broadcast to ${activeChannel.members.length} subscriber${activeChannel.members.length !== 1 ? "s" : ""}...`}
                    className="flex-1 min-h-[60px] max-h-[140px] resize-none rounded-2xl text-sm bg-muted/60 border-border/60 focus-visible:ring-1 focus-visible:ring-primary/50"
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
                    className="gradient-btn rounded-xl w-10 h-10 flex-shrink-0 self-end mb-0.5"
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                    data-ocid="channels.post.submit_button"
                  >
                    <Send size={15} className="text-white" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                  Ctrl + Enter to post · Only you can broadcast
                </p>
              </div>
            ) : (
              <div className="px-4 py-3 border-t border-border bg-muted/20 text-center flex-shrink-0">
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                  <BellOff size={12} />
                  Subscribers can view posts only
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Empty state when no channel selected */
          <div className="hidden md:flex flex-1 items-center justify-center flex-col gap-5 text-center px-8">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{
                background: "oklch(var(--primary) / 0.08)",
                border: "1px solid oklch(var(--primary) / 0.15)",
              }}
            >
              <Radio size={34} className="text-primary/50" strokeWidth={1.5} />
            </div>
            <div className="max-w-xs">
              <p className="font-semibold text-base">Select a channel</p>
              <p className="text-sm text-muted-foreground mt-1.5">
                Join a channel to follow broadcasts, or create your own to reach
                your followers
              </p>
            </div>
            <Button
              size="sm"
              className="gradient-btn rounded-xl gap-1.5"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={13} className="text-white" />
              <span className="text-white text-xs font-semibold">
                Create Channel
              </span>
            </Button>
          </div>
        )}
      </div>

      {/* Create channel modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent
          className="rounded-3xl max-w-sm"
          data-ocid="channels.create.modal"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radio size={16} className="text-primary" />
              Create Channel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">
                Channel Name *
              </p>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Tech News"
                className="rounded-xl"
                data-ocid="channels.create.name_input"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">
                Topic
              </p>
              <Input
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="e.g. Technology, Sports, Gaming..."
                className="rounded-xl"
                data-ocid="channels.create.topic_input"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">
                Description
              </p>
              <Textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What will you broadcast about?"
                className="rounded-xl resize-none"
                rows={3}
                data-ocid="channels.create.description_textarea"
              />
            </div>
            <Separator />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setShowCreateModal(false)}
                data-ocid="channels.create.cancel_button"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gradient-btn rounded-xl"
                onClick={handleCreateChannel}
                disabled={!newName.trim()}
                data-ocid="channels.create.submit_button"
              >
                <span className="text-white font-semibold">Create</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="py-3 text-center border-t border-border/30 flex-shrink-0">
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
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return new Date(ts).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}
