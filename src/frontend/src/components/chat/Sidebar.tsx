import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Bookmark,
  Check,
  CheckCheck,
  Clock,
  Edit,
  Folder,
  FolderPlus,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  NotebookPen,
  Pin,
  Search,
  UserPlus,
  Users2,
} from "lucide-react";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { useChat } from "../../contexts/ChatContext";
import { extractPlainBio } from "../../services/bioStorageService";
import {
  type ChatFolder,
  addChatToFolder,
  createChatFolder,
  getActiveStatus,
  getActiveStatusLabel,
  getChatFolders,
  getMood,
  getNote,
} from "../../services/featureService";
import { hasPendingRequest } from "../../services/followService";
import type { AppUser, Chat, GroupChat } from "../../types";
import { CreateGroupModal } from "./CreateGroupModal";
import { StoryBarICP } from "./StoryBarICP";
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
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentUid = currentUser!.uid;

  // Load folders on mount
  useEffect(() => {
    setFolders(getChatFolders(currentUid));
  }, [currentUid]);

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
      // Clear search immediately for responsive feel
      setSearch("");
      setUserResults([]);

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
        return;
      }

      try {
        const { chatId, isRequest } = await openChat(
          currentUid,
          user.uid,
          user,
        );
        if (!isRequest) {
          onChatSelect?.(chatId);
        } else {
          toast.info("Message request sent");
        }
      } catch {
        toast.error("Could not open chat. Please try again.");
      }
    },
    [openChat, currentUid, onChatSelect, sendFollowRequest],
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

  // Active folder filter
  const activeFolder = activeFolderId
    ? folders.find((f) => f.id === activeFolderId)
    : null;

  // Unified list: DM chats + group chats sorted by lastUpdated, filtered by folder
  const allChatItems = [
    ...regularChats
      .filter((c) => !activeFolder || activeFolder.chatIds.includes(c.id))
      .map((c) => ({
        type: "dm" as const,
        id: c.id,
        updatedAt: c.lastUpdated,
        data: c,
      })),
    ...groupChats
      .filter((g) => !activeFolder || activeFolder.chatIds.includes(g.id))
      .map((g) => ({
        type: "group" as const,
        id: g.id,
        updatedAt: g.lastUpdated,
        data: g,
      })),
  ].sort((a, b) => b.updatedAt - a.updatedAt);

  // Create a new folder
  const handleCreateFolder = () => {
    const name = prompt("Folder name (e.g. Work, Friends):");
    if (!name?.trim()) return;
    const colors = ["#E1306C", "#833AB4", "#0083B0", "#11998e", "#F7971E"];
    const color = colors[folders.length % colors.length];
    const folder = createChatFolder(currentUid, name.trim(), color);
    setFolders(getChatFolders(currentUid));
    setActiveFolderId(folder.id);
    toast.success(`Folder "${folder.name}" created`);
  };

  // Add chat to folder
  const handleAddToFolder = (chatId: string, folderId: string) => {
    addChatToFolder(currentUid, folderId, chatId);
    setFolders(getChatFolders(currentUid));
    const folder = folders.find((f) => f.id === folderId);
    if (folder) toast.success(`Added to "${folder.name}"`);
  };

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
                  onClick={() => navigate({ to: "/saved" })}
                >
                  <Bookmark size={15} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Saved Messages
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                  onClick={() => navigate({ to: "/notes" })}
                >
                  <NotebookPen size={15} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Notes
              </TooltipContent>
            </Tooltip>
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

      {/* Story bar */}
      <StoryBarICP />

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

      {/* Folder tabs (only show when not in search mode) */}
      {!isSearchMode && folders.length > 0 && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveFolderId(null)}
              className={cn(
                "flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all",
                !activeFolderId
                  ? "bg-primary/10 border-primary text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              All
            </button>
            {folders.map((folder) => {
              // Count chats in this folder that have unread msgs
              const folderUnread = folder.chatIds.reduce((acc, chatId) => {
                const chatMsgs = messages[chatId] ?? [];
                return (
                  acc +
                  chatMsgs.filter(
                    (m) =>
                      m.senderId !== currentUid &&
                      !m.seenBy.includes(currentUid),
                  ).length
                );
              }, 0);
              return (
                <button
                  type="button"
                  key={folder.id}
                  onClick={() =>
                    setActiveFolderId(
                      activeFolderId === folder.id ? null : folder.id,
                    )
                  }
                  className={cn(
                    "flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-all",
                    activeFolderId === folder.id
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: folder.color }}
                  />
                  {folder.name}
                  {folderUnread > 0 && (
                    <span className="bg-primary text-primary-foreground rounded-full text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center">
                      {folderUnread > 9 ? "9+" : folderUnread}
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={handleCreateFolder}
              className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground border border-dashed border-border/50 hover:border-primary/40 transition-all"
            >
              <FolderPlus size={11} />
            </button>
          </div>
        </div>
      )}

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
                      {extractPlainBio(user.bio || "") && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {extractPlainBio(user.bio || "")}
                        </p>
                      )}
                      {getNote(user.uid) && (
                        <p className="text-[10px] text-primary/70 truncate flex items-center gap-0.5 mt-0.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/50 flex-shrink-0" />
                          {getNote(user.uid)}
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
                    <div
                      key={`group_${item.id}`}
                      className="relative group/item"
                    >
                      <GroupListItem
                        group={item.data as GroupChat}
                        users={users}
                        currentUid={currentUid}
                        messages={groupMessages[item.id] ?? []}
                        isActive={activeGroupChatId === item.id}
                        onClick={() => handleSelectGroup(item.id)}
                      />
                      {folders.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center hover:bg-sidebar-accent text-muted-foreground"
                            >
                              <MoreHorizontal size={13} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="rounded-xl w-44"
                          >
                            <p className="px-2 py-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
                              <Folder size={9} /> Add to folder
                            </p>
                            {folders.map((folder) => (
                              <DropdownMenuItem
                                key={folder.id}
                                onClick={() =>
                                  handleAddToFolder(item.id, folder.id)
                                }
                              >
                                <span
                                  className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                                  style={{ background: folder.color }}
                                />
                                {folder.name}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem onClick={handleCreateFolder}>
                              <FolderPlus size={12} className="mr-2" />
                              New folder
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                }
                return (
                  <div key={item.id} className="relative group/item">
                    <ChatListItem
                      chat={item.data as Chat}
                      users={users}
                      currentUid={currentUid}
                      messages={messages[item.id] ?? []}
                      isActive={activeChatId === item.id}
                      onClick={() => handleSelectChat(item.id)}
                    />
                    {folders.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center hover:bg-sidebar-accent text-muted-foreground"
                          >
                            <MoreHorizontal size={13} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="rounded-xl w-44"
                        >
                          <p className="px-2 py-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
                            <Folder size={9} /> Add to folder
                          </p>
                          {folders.map((folder) => (
                            <DropdownMenuItem
                              key={folder.id}
                              onClick={() =>
                                handleAddToFolder(item.id, folder.id)
                              }
                            >
                              <span
                                className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                                style={{ background: folder.color }}
                              />
                              {folder.name}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuItem onClick={handleCreateFolder}>
                            <FolderPlus size={12} className="mr-2" />
                            New folder
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
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
  const otherMood = getMood(otherUid);
  const otherNote = getNote(otherUid);
  const activeStatus = getActiveStatus(other);
  const activeLabel = getActiveStatusLabel(other);

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
          <div className="flex items-center gap-1.5 min-w-0">
            <p
              className={cn(
                "text-sm truncate",
                !isSeen ? "font-bold" : "font-medium",
              )}
            >
              {other.username}
            </p>
            {otherMood && (
              <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                {otherMood.split(" ")[0]}
              </span>
            )}
            {otherNote && (
              <span className="text-[9px] text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded-full truncate max-w-[80px] hidden sm:inline">
                {otherNote}
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground flex-shrink-0">
            {time}
          </span>
        </div>
        {/* Active status row */}
        <div className="flex items-center gap-1 mt-0.5">
          {activeStatus === "active" ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              {activeLabel}
            </span>
          ) : (
            <>
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
            </>
          )}
          {unread > 0 && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-primary text-primary-foreground rounded-full text-[10px] font-bold flex items-center justify-center px-1 badge-pop ml-auto">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
          {chat.muted[currentUid] && (
            <span className="text-muted-foreground opacity-50 text-xs">🔇</span>
          )}
        </div>
        {/* When active, still show last message below */}
        {activeStatus === "active" && (
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
          </div>
        )}
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
