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
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Hash,
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
  saveRooms,
} from "../services/featureService";

// ─── Channel helpers (re-using PublicRoom type but in channel context) ─────────

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
    }, 1500);

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
          onClick={() => setShowCreateModal(true)}
          data-ocid="channels.create.open_modal_button"
        >
          <Plus size={13} className="text-white" />
          <span className="text-white text-xs font-semibold">Create</span>
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Channels list */}
        <div
          className={`w-full md:w-80 border-r border-border flex flex-col ${activeChannel ? "hidden md:flex" : "flex"}`}
        >
          {/* Search */}
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

          <ScrollArea className="flex-1">
            {filteredChannels.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16 gap-3 px-6"
                data-ocid="channels.empty_state"
              >
                <Hash
                  size={28}
                  className="text-muted-foreground/50"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-muted-foreground text-center">
                  No channels yet. Create one to get started!
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredChannels.map((channel, idx) => {
                  const member = isMember(channel);
                  const owner = isOwner(channel);
                  const muted = mutedChannels.has(channel.id);

                  return (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => {
                        if (member) setActiveChannel(channel);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                        activeChannel?.id === channel.id
                          ? "bg-primary/10"
                          : "hover:bg-accent"
                      }`}
                      data-ocid={`channels.item.${idx + 1}`}
                    >
                      <div className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center flex-shrink-0">
                        <Hash size={18} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold truncate">
                            {channel.name}
                          </p>
                          {owner && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] px-1 py-0 h-4 flex-shrink-0"
                            >
                              Owner
                            </Badge>
                          )}
                          {muted && (
                            <BellOff
                              size={11}
                              className="text-muted-foreground flex-shrink-0"
                            />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {channel.topic}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Users size={10} />
                          {channel.members.length}
                        </span>
                        {!member && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoinLeave(channel);
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

        {/* Channel view */}
        {activeChannel ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Channel header */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-background/95 backdrop-blur-sm">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden w-9 h-9 rounded-xl"
                onClick={() => setActiveChannel(null)}
              >
                <ArrowLeft size={18} />
              </Button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Hash size={15} className="text-primary flex-shrink-0" />
                  <p className="font-semibold text-sm truncate">
                    {activeChannel.name}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeChannel.members.length} subscribers ·{" "}
                  {activeChannel.topic}
                </p>
              </div>
              <div className="flex items-center gap-1">
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
                    <BellOff size={16} />
                  ) : (
                    <Bell size={16} />
                  )}
                </Button>
                {!isOwner(activeChannel) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs rounded-xl text-destructive hover:text-destructive"
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

            {/* Channel description */}
            {activeChannel.description && (
              <div className="px-4 py-2 bg-muted/30 border-b border-border">
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
                    {isOwner(activeChannel)
                      ? "Start broadcasting to your subscribers"
                      : "No posts yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {channelMessages.map((msg, idx) => (
                    <div
                      key={msg.id}
                      data-ocid={`channels.message.item.${idx + 1}`}
                    >
                      <div className="bg-card border border-border rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                              {msg.authorUsername.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-semibold">
                            @{msg.authorUsername}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[9px] h-4 px-1.5"
                          >
                            Owner
                          </Badge>
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {formatRelativeTime(msg.createdAt)}
                          </span>
                        </div>
                        <Separator className="mb-2" />
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Post area — only for channel owner */}
            {isOwner(activeChannel) ? (
              <div className="p-3 border-t border-border bg-background">
                <div className="flex items-end gap-2">
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Post to your channel..."
                    className="flex-1 min-h-[60px] max-h-[120px] resize-none rounded-xl text-sm"
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
                    disabled={!inputText.trim()}
                    data-ocid="channels.post.submit_button"
                  >
                    <Send size={15} className="text-white" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Ctrl + Enter to send
                </p>
              </div>
            ) : (
              <div className="p-4 border-t border-border bg-background/80 text-center">
                <p className="text-xs text-muted-foreground">
                  Only the channel owner can post
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center flex-col gap-4 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
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

      {/* Create channel modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent
          className="rounded-3xl max-w-sm"
          data-ocid="channels.create.modal"
        >
          <DialogHeader>
            <DialogTitle>Create Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Channel Name *
              </p>
              <Input
                id="channel-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Tech News"
                className="rounded-xl"
                data-ocid="channels.create.name_input"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Topic
              </p>
              <Input
                id="channel-topic"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="e.g. Technology"
                className="rounded-xl"
                data-ocid="channels.create.topic_input"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Description
              </p>
              <Textarea
                id="channel-desc"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What is this channel about?"
                className="rounded-xl resize-none"
                rows={3}
                data-ocid="channels.create.description_textarea"
              />
            </div>
            <div className="flex gap-2 pt-1">
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
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
