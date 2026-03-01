import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Hash, LogOut, Plus, Send, Users2 } from "lucide-react";
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

export function PublicRoomsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<PublicRoom | null>(null);
  const [roomMessages, setRoomMessages] = useState<RoomMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    topic: "",
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUid = currentUser!.uid;
  const currentUsername = currentUser!.username;

  // Enable scrolling on sub-page
  useEffect(() => {
    document.body.classList.add("page-subpage");
    document.getElementById("root")?.classList.add("page-subpage");
    return () => {
      document.body.classList.remove("page-subpage");
      document.getElementById("root")?.classList.remove("page-subpage");
    };
  }, []);

  useEffect(() => {
    const loaded = getRooms();
    // Add sample rooms if none exist
    if (loaded.length === 0) {
      const sample1 = createRoom(
        "General",
        "General discussion for everyone",
        "Chat",
        "system",
        "system",
      );
      const sample2 = createRoom(
        "Tech Talk",
        "Discuss the latest in tech",
        "Technology",
        "system",
        "system",
      );
      const sample3 = createRoom(
        "Gaming Lounge",
        "All things gaming",
        "Gaming",
        "system",
        "system",
      );
      setRooms([sample1, sample2, sample3]);
    } else {
      setRooms(loaded);
    }
  }, []);

  useEffect(() => {
    if (activeRoom) {
      setRoomMessages(getRoomMessages(activeRoom.id));
    }
  }, [activeRoom]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: length-only dep is intentional
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [roomMessages.length]);

  const handleJoinRoom = (room: PublicRoom) => {
    joinRoom(room.id, currentUid);
    const updated = getRooms();
    setRooms(updated);
    const updatedRoom = updated.find((r) => r.id === room.id) ?? room;
    setActiveRoom(updatedRoom);
    toast.success(`Joined #${room.name}`);
  };

  const handleLeaveRoom = (room: PublicRoom) => {
    leaveRoom(room.id, currentUid);
    const updated = getRooms();
    setRooms(updated);
    setActiveRoom(null);
    toast.info(`Left #${room.name}`);
  };

  const handleSendMessage = () => {
    if (!activeRoom || !inputText.trim()) return;
    const isCreator = activeRoom.creatorId === currentUid;
    if (!isCreator) {
      toast.error("Only the channel creator can post messages");
      return;
    }
    const msg = addRoomMessage(
      activeRoom.id,
      currentUid,
      currentUsername,
      inputText.trim(),
    );
    setRoomMessages((prev) => [...prev, msg]);
    setInputText("");
  };

  const handleCreateRoom = () => {
    if (!createForm.name.trim()) {
      toast.error("Channel name is required");
      return;
    }
    const room = createRoom(
      createForm.name.trim(),
      createForm.description.trim(),
      createForm.topic.trim(),
      currentUid,
      currentUsername,
    );
    setRooms(getRooms());
    setCreateForm({ name: "", description: "", topic: "" });
    setShowCreateModal(false);
    setActiveRoom(room);
    toast.success(`Channel #${room.name} created!`);
  };

  const isJoined = (room: PublicRoom) => room.members.includes(currentUid);

  return (
    <div className="min-h-dvh bg-background flex flex-col page-fade">
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
          <Users2 size={18} className="text-primary" />
          <h1
            className="font-bold text-lg tracking-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Public Rooms
          </h1>
        </div>
        <Button
          size="sm"
          className="ml-auto rounded-xl gradient-btn h-8 px-3 gap-1.5"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={14} className="text-white" />
          <span className="text-white text-xs">Create</span>
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Room list */}
        <div
          className={`${activeRoom ? "hidden md:flex" : "flex"} w-full md:w-72 flex-col border-r border-border overflow-y-auto`}
        >
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              {rooms.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-2">
                  <Users2 size={28} className="text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">
                    No rooms yet. Create one!
                  </p>
                </div>
              ) : (
                rooms.map((room) => (
                  <button
                    type="button"
                    key={room.id}
                    onClick={() => {
                      if (isJoined(room)) {
                        setActiveRoom(room);
                      } else {
                        handleJoinRoom(room);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-colors ${
                      activeRoom?.id === room.id
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-accent/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Hash size={14} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {room.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {room.description}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-muted-foreground">
                          {room.members.length} members
                        </span>
                        {isJoined(room) && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            Joined
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Room content */}
        {activeRoom ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Room header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden w-8 h-8 rounded-xl"
                onClick={() => setActiveRoom(null)}
              >
                <ArrowLeft size={16} />
              </Button>
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Hash size={14} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{activeRoom.name}</p>
                <p className="text-xs text-muted-foreground">
                  {activeRoom.members.length} members ·{" "}
                  {activeRoom.topic || "No topic"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleLeaveRoom(activeRoom)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl h-8 px-3 gap-1.5 text-xs"
              >
                <LogOut size={13} />
                Leave
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1">
              <div className="px-4 py-3 space-y-2">
                {roomMessages.length === 0 ? (
                  <div className="flex flex-col items-center py-12 gap-2">
                    <Hash size={32} className="text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      No messages yet
                    </p>
                    {activeRoom.creatorId === currentUid && (
                      <p className="text-xs text-muted-foreground">
                        Be the first to post!
                      </p>
                    )}
                    {activeRoom.creatorId !== currentUid && (
                      <p className="text-xs text-muted-foreground">
                        Only the creator can post here
                      </p>
                    )}
                  </div>
                ) : (
                  roomMessages.map((msg) => (
                    <div key={msg.id} className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">
                          {msg.authorUsername.slice(0, 1).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-semibold">
                            @{msg.authorUsername}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm mt-0.5 break-words">{msg.text}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input — only for creator */}
            {activeRoom.creatorId === currentUid ? (
              <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder={`Announce to #${activeRoom.name}...`}
                  className="flex-1 rounded-2xl bg-muted/60 border-border/60 text-sm h-10"
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!inputText.trim()}
                  className="w-10 h-10 rounded-xl gradient-btn flex-shrink-0"
                >
                  <Send size={15} className="text-white" />
                </Button>
              </div>
            ) : (
              <div className="px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  This is a read-only channel. Only the creator can post.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Hash size={24} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold">Join a Channel</p>
              <p className="text-sm text-muted-foreground mt-1">
                Select a room from the left to read announcements
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash size={16} className="text-primary" />
              Create a Channel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Channel Name *
              </Label>
              <Input
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. announcements"
                className="rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Description
              </Label>
              <Textarea
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="What's this channel about?"
                className="rounded-xl resize-none text-sm"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Topic
              </Label>
              <Input
                value={createForm.topic}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, topic: e.target.value }))
                }
                placeholder="e.g. Tech, Gaming, General"
                className="rounded-xl"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl gradient-btn"
                onClick={handleCreateRoom}
              >
                <span className="text-white text-sm">Create Channel</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="py-4 text-center border-t border-border">
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
