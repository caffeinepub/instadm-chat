import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import {
  Archive,
  Check,
  CheckCheck,
  Clock,
  Edit,
  Loader2,
  MessageSquare,
  Pin,
  Search,
  UserPlus,
  Users2,
} from "lucide-react";
import React, { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { useChat } from "../../contexts/ChatContext";
import { hasPendingRequest } from "../../services/followService";
import type { AppUser, Chat, GroupChat } from "../../types";
import { CreateGroupModal } from "./CreateGroupModal";
import { UserAvatar } from "./UserAvatar";

interface SidebarProps {
  onChatSelect?: (chatId: string) => void;
  onGroupSelect?: (groupId: string) => void;
}

export function Sidebar({ onChatSelect, onGroupSelect }: SidebarProps) {
  const navigate = useNavigate();
  const {
    chats,
    users,
    messages,
    activeChatId,
    setActiveChatId,
    searchUsers,
    openChat,
    requests,
    followRequests,
    sendFollowRequest,
    acceptFollowRequest,
    declineFollowRequest,
    groupChats,
    groupMessages,
    activeGroupChatId,
    setActiveGroupChatId,
  } = useChat();
  const { currentUser } = useAuth();

  const [search, setSearch] = useState("");
  const [userResults, setUserResults] = useState<AppUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentUid = currentUser!.uid;

  const handleSearch = useCallback(
    (q: string) => {
      setSearch(q);

      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }

      if (!q.trim()) {
        setUserResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      searchTimer.current = setTimeout(async () => {
        try {
          const results = await searchUsers(q.trim(), currentUid);
          setUserResults(results);
        } catch {
          setUserResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 350);
    },
    [searchUsers, currentUid],
  );

  const handleSelectChat = useCallback(
    (chatId: string) => {
      setActiveChatId(chatId);
      onChatSelect?.(chatId);
    },
    [setActiveChatId, onChatSelect],
  );

  const handleSelectGroup = useCallback(
    (groupId: string) => {
      setActiveGroupChatId(groupId);
      onGroupSelect?.(groupId);
    },
    [setActiveGroupChatId, onGroupSelect],
  );

  const handleUserClick = useCallback(
    async (user: AppUser) => {
      // Check if private account and not a follower
      if (user.isPrivate && !user.followers.includes(currentUid)) {
        const alreadyRequested = hasPendingRequest(currentUid, user.uid);
        if (alreadyRequested) {
          toast.info("Follow request already sent. Waiting for approval.");
        } else {
          sendFollowRequest(user.uid, user.username);
          toast.success(
            `Follow request sent to @${user.username}. They must accept before you can chat.`,
          );
        }
        setSearch("");
        setUserResults([]);
        return;
      }

      try {
        const { chatId, isRequest } = await openChat(
          currentUid,
          user.uid,
          user,
        );
        setSearch("");
        setUserResults([]);
        if (!isRequest) {
          handleSelectChat(chatId);
        } else {
          toast.info("Message request sent");
        }
      } catch {
        // Silently fail — user can try again
      }
    },
    [openChat, currentUid, handleSelectChat, sendFollowRequest],
  );

  // Sort chats: pinned first, then by lastUpdated
  const myChats = chats.filter(
    (c) => c.participants.includes(currentUid) && !c.archived[currentUid],
  );
  const pinnedChats = myChats.filter((c) => c.pinned[currentUid]);
  const regularChats = myChats
    .filter((c) => !c.pinned[currentUid])
    .sort((a, b) => b.lastUpdated - a.lastUpdated);

  const archivedCount = chats.filter((c) => c.archived[currentUid]).length;
  const pendingRequests = requests.filter(
    (r) => r.receiverId === currentUid && r.status === "pending",
  );

  // Follow requests pending for current user
  const pendingFollowRequests = followRequests.filter(
    (r) => r.receiverId === currentUid && r.status === "pending",
  );

  const totalRequestBadge =
    pendingRequests.length + pendingFollowRequests.length;

  const isSearchMode = !!search.trim();

  // Unified list: DM chats + group chats sorted by lastUpdated
  const allChatItems = [
    ...regularChats.map((c) => ({
      type: "dm" as const,
      id: c.id,
      updatedAt: c.lastUpdated,
      data: c,
    })),
    ...groupChats.map((g) => ({
      type: "group" as const,
      id: g.id,
      updatedAt: g.lastUpdated,
      data: g,
    })),
  ].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-sidebar-border/50">
        <h1
          className="font-bold text-xl tracking-tight"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Messages
        </h1>
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                  onClick={() => setShowCreateGroup(true)}
                >
                  <Users2 size={15} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                New Group
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                  onClick={() => {
                    document.getElementById("sidebar-search")?.focus();
                  }}
                >
                  <Edit size={15} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                New Chat
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            id="sidebar-search"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by username..."
            className="pl-8 pr-8 rounded-xl bg-muted/50 border border-border/50 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/40 h-9 text-sm transition-all"
          />
          {isSearching && (
            <Loader2
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin"
            />
          )}
        </div>
      </div>

      {/* Search Results */}
      {isSearchMode ? (
        <div className="flex-1 overflow-y-auto">
          {userResults.length === 0 && !isSearching ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 gap-2">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Search size={18} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                No users found for "{search}"
              </p>
              <p className="text-xs text-muted-foreground text-center opacity-70">
                Try searching with a different username
              </p>
            </div>
          ) : (
            <div className="px-2 pb-2">
              {userResults.length > 0 && (
                <p className="text-[11px] text-muted-foreground px-3 pt-1 pb-2 font-medium uppercase tracking-wider">
                  People
                </p>
              )}
              {userResults.map((user) => {
                const isPrivateAndNotFollower =
                  user.isPrivate && !user.followers.includes(currentUid);
                const alreadyRequested =
                  isPrivateAndNotFollower &&
                  hasPendingRequest(currentUid, user.uid);

                return (
                  <button
                    type="button"
                    key={user.uid}
                    onClick={() => handleUserClick(user)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-sidebar-accent transition-colors"
                  >
                    <UserAvatar
                      src={user.profilePicture}
                      username={user.username}
                      isOnline={user.onlineStatus}
                      size="md"
                    />
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">
                          @{user.username}
                        </p>
                        {user.isPrivate && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 h-4"
                          >
                            Private
                          </Badge>
                        )}
                        {alreadyRequested && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 h-4 text-primary border-primary/30"
                          >
                            <Clock size={8} className="mr-0.5" />
                            Pending
                          </Badge>
                        )}
                      </div>
                      {user.bio && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {user.bio}
                        </p>
                      )}
                    </div>
                    {isPrivateAndNotFollower && !alreadyRequested && (
                      <UserPlus
                        size={14}
                        className="text-primary flex-shrink-0"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Chat list */
        <Tabs defaultValue="chats" className="flex flex-col flex-1 min-h-0">
          <TabsList className="mx-4 mb-2 grid grid-cols-2 h-8 bg-muted/60 rounded-xl">
            <TabsTrigger value="chats" className="text-xs rounded-lg">
              Chats
            </TabsTrigger>
            <TabsTrigger value="requests" className="text-xs rounded-lg gap-1">
              Requests
              {totalRequestBadge > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full text-[9px] font-bold w-4 h-4 flex items-center justify-center">
                  {totalRequestBadge > 9 ? "9+" : totalRequestBadge}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chats" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-full">
              {/* Pinned DM chats */}
              {pinnedChats.length > 0 && (
                <div className="mb-1">
                  <p className="text-[10px] text-muted-foreground px-4 py-1.5 font-semibold uppercase tracking-widest flex items-center gap-1.5">
                    <Pin size={9} /> Pinned
                  </p>
                  {pinnedChats.map((chat) => (
                    <ChatListItem
                      key={chat.id}
                      chat={chat}
                      users={users}
                      currentUid={currentUid}
                      messages={messages[chat.id] ?? []}
                      isActive={activeChatId === chat.id}
                      onClick={() => handleSelectChat(chat.id)}
                    />
                  ))}
                </div>
              )}

              {/* Combined: DM chats + Group chats sorted by recency */}
              {allChatItems.map((item) => {
                if (item.type === "group") {
                  return (
                    <GroupListItem
                      key={`group_${item.id}`}
                      group={item.data as GroupChat}
                      users={users}
                      currentUid={currentUid}
                      messages={groupMessages[item.id] ?? []}
                      isActive={activeGroupChatId === item.id}
                      onClick={() => handleSelectGroup(item.id)}
                    />
                  );
                }
                return (
                  <ChatListItem
                    key={item.id}
                    chat={item.data as Chat}
                    users={users}
                    currentUid={currentUid}
                    messages={messages[item.id] ?? []}
                    isActive={activeChatId === item.id}
                    onClick={() => handleSelectChat(item.id)}
                  />
                );
              })}

              {myChats.length === 0 && groupChats.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 px-8 gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                    <MessageSquare
                      size={24}
                      className="text-muted-foreground"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">No conversations</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Search for a friend or create a group to start chatting
                    </p>
                  </div>
                </div>
              )}

              {/* Archived */}
              {archivedCount > 0 && (
                <button
                  type="button"
                  onClick={() => navigate({ to: "/archive" })}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sidebar-accent transition-colors text-muted-foreground"
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Archive size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">
                      Archived
                    </p>
                    <p className="text-xs">
                      {archivedCount} chat
                      {archivedCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </button>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="requests" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-full">
              {pendingRequests.length === 0 &&
              pendingFollowRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-8 gap-3">
                  <p className="text-sm text-muted-foreground text-center">
                    No pending requests
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {/* Follow requests */}
                  {pendingFollowRequests.length > 0 && (
                    <>
                      <p className="text-[10px] text-muted-foreground px-3 pt-1 pb-1.5 font-semibold uppercase tracking-widest flex items-center gap-1.5">
                        <UserPlus size={9} className="text-primary" /> Follow
                        Requests
                      </p>
                      {pendingFollowRequests.map((req) => {
                        const sender = users[req.senderId];
                        return (
                          <div
                            key={req.id}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-sidebar-accent transition-colors"
                          >
                            <UserAvatar
                              src={sender?.profilePicture}
                              username={
                                sender?.username ?? req.senderUsername ?? "?"
                              }
                              size="sm"
                              showOnline={false}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">
                                @
                                {sender?.username ??
                                  req.senderUsername ??
                                  req.senderId.slice(-6)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Wants to follow you
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                className="h-7 px-2 rounded-lg text-xs gradient-btn"
                                onClick={() => {
                                  acceptFollowRequest(req.id);
                                  toast.success("Follow request accepted");
                                }}
                              >
                                <span className="text-white">Accept</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 rounded-lg text-xs"
                                onClick={() => {
                                  declineFollowRequest(req.id);
                                }}
                              >
                                Decline
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* Message requests */}
                  {pendingRequests.length > 0 && (
                    <>
                      <p className="text-[10px] text-muted-foreground px-3 pt-3 pb-1.5 font-semibold uppercase tracking-widest">
                        Message Requests
                      </p>
                      {pendingRequests.map((req) => {
                        const sender = users[req.senderId];
                        return (
                          <div
                            key={req.id}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-sidebar-accent transition-colors"
                          >
                            <UserAvatar
                              src={sender?.profilePicture}
                              username={sender?.username ?? "?"}
                              size="md"
                              showOnline={false}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold">
                                {sender?.username}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {req.previewMessage}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full rounded-xl mt-2 text-xs"
                        onClick={() => navigate({ to: "/requests" })}
                      >
                        View all message requests
                      </Button>
                    </>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}
      {/* Create Group Modal */}
      <CreateGroupModal
        open={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onGroupCreated={(group) => {
          handleSelectGroup(group.id);
        }}
      />
    </div>
  );
}

function GroupListItem({
  group,
  currentUid,
  messages,
  isActive,
  onClick,
}: {
  group: GroupChat;
  users?: Record<string, AppUser>;
  currentUid: string;
  messages: import("../../types").Message[];
  isActive: boolean;
  onClick: () => void;
}) {
  const unread = messages.filter(
    (m) => m.senderId !== currentUid && !m.seenBy.includes(currentUid),
  ).length;

  const lastMsg = messages.at(-1);
  const lastMsgText = lastMsg?.deletedForEveryone
    ? "Message deleted"
    : lastMsg?.messageType !== "text" && lastMsg?.messageType
      ? `📎 ${lastMsg.messageType}`
      : (lastMsg?.text ?? group.lastMessage ?? "");

  const time = group.lastUpdated ? formatTime(group.lastUpdated) : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left relative",
        isActive ? "chat-item-active" : "hover:bg-sidebar-accent/50",
      )}
    >
      {/* Group icon */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full group-icon-gradient flex items-center justify-center">
          <Users2 size={18} className="text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className="text-sm font-medium truncate flex items-center gap-1.5">
            {group.name}
            <span className="text-[9px] bg-muted text-muted-foreground px-1 py-0.5 rounded font-semibold">
              GROUP
            </span>
          </p>
          <span className="text-[10px] text-muted-foreground flex-shrink-0">
            {time}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <p className="text-xs truncate flex-1 text-muted-foreground">
            {lastMsgText || `${group.members.length} members`}
          </p>
          {unread > 0 && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-primary text-primary-foreground rounded-full text-[10px] font-bold flex items-center justify-center px-1 badge-pop">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function ChatListItem({
  chat,
  users,
  currentUid,
  messages,
  isActive,
  onClick,
}: {
  chat: Chat;
  users: Record<string, AppUser>;
  currentUid: string;
  messages: import("../../types").Message[];
  isActive: boolean;
  onClick: () => void;
}) {
  const otherUid = chat.participants.find((p) => p !== currentUid) ?? "";
  const other = users[otherUid];
  if (!other) return null;

  const unread = messages.filter(
    (m) => m.senderId !== currentUid && !m.seenBy.includes(currentUid),
  ).length;

  const lastMsg = messages.at(-1);
  const lastMsgText = lastMsg?.deletedForEveryone
    ? "Message deleted"
    : lastMsg?.messageType !== "text" && lastMsg?.messageType
      ? `📎 ${lastMsg.messageType}`
      : (lastMsg?.text ?? chat.lastMessage);

  const time = chat.lastUpdated ? formatTime(chat.lastUpdated) : "";

  const isSeen =
    !lastMsg ||
    lastMsg.senderId === currentUid ||
    lastMsg.seenBy.includes(currentUid);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left relative",
        isActive ? "chat-item-active" : "hover:bg-sidebar-accent/50",
      )}
    >
      <UserAvatar
        src={other.profilePicture}
        username={other.username}
        isOnline={other.onlineStatus}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p
            className={cn(
              "text-sm truncate",
              !isSeen ? "font-bold" : "font-medium",
            )}
          >
            {other.username}
          </p>
          <span className="text-[10px] text-muted-foreground flex-shrink-0">
            {time}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {lastMsg?.senderId === currentUid && (
            <span className="flex-shrink-0">
              {lastMsg.seenBy.includes(otherUid) ? (
                <CheckCheck size={11} className="text-primary" />
              ) : (
                <Check size={11} className="text-muted-foreground" />
              )}
            </span>
          )}
          <p
            className={cn(
              "text-xs truncate flex-1",
              !isSeen
                ? "font-semibold text-foreground"
                : "text-muted-foreground",
            )}
          >
            {lastMsgText || "Start a conversation"}
          </p>
          {unread > 0 && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-primary text-primary-foreground rounded-full text-[10px] font-bold flex items-center justify-center px-1 badge-pop">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
          {chat.muted[currentUid] && (
            <span className="text-muted-foreground opacity-50 text-xs">🔇</span>
          )}
        </div>
      </div>
    </button>
  );
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return new Date(ts).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}
