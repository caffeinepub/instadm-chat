import { Principal } from "@icp-sdk/core/principal";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import type {
  Chat as BackendChat,
  GroupChat as BackendGroupChat,
  Message as BackendMessage,
  UserProfile,
} from "../backend.d";
import { useActor } from "../hooks/useActor";
import {
  addNotification,
  generateChatId,
  generateId,
  getNotifications,
  getRequests,
  getUsers,
  loadFromStorage,
  searchUsers as localSearchUsers,
  saveNotifications,
  saveRequests,
  saveToStorage,
  saveUser,
} from "../services/chatService";
import {
  type FollowRequest,
  addFollowRequest,
  cancelFollowRequest,
  generateFollowRequestId,
  getFollowRequests,
  getPendingRequestsForUser,
  hasPendingRequest,
  saveFollowRequests,
  updateRequestStatus,
} from "../services/followService";
import {
  showGroupNotification,
  showMessageNotification,
} from "../services/notificationService";
import type {
  AppNotification,
  AppUser,
  Chat,
  GroupChat,
  Message,
  MessageRequest,
  MessageType,
} from "../types";

// ─── Conversion helpers ───────────────────────────────────────────────────────

function backendProfileToAppUser(profile: UserProfile): AppUser {
  return {
    uid: profile._id.toString(),
    username: profile.username,
    email: profile.email || "",
    profilePicture:
      profile.profilePicture ||
      `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(profile.username)}&backgroundColor=8b5cf6&textColor=ffffff`,
    bio: profile.bio,
    isPrivate: profile.isPrivate,
    onlineStatus: profile.onlineStatus,
    lastSeen:
      typeof profile.lastSeen === "bigint"
        ? Number(profile.lastSeen / BigInt(1_000_000))
        : Date.now(),
    blockedUsers: profile.blockedUsers.map((p) => p.toString()),
    followers: profile.followers.map((p) => p.toString()),
    following: profile.following.map((p) => p.toString()),
    createdAt:
      typeof profile.createdAt === "bigint"
        ? Number(profile.createdAt / BigInt(1_000_000))
        : Date.now(),
  };
}

function backendChatToFrontend(
  backendChat: BackendChat,
  chatId: string,
  lastMessageText = "",
): Chat {
  return {
    id: chatId,
    participants: backendChat.participants.map((p) => p.toString()),
    createdAt: Number(backendChat.createdAt / BigInt(1_000_000)),
    lastMessage: lastMessageText,
    lastUpdated: Number(backendChat.lastUpdated / BigInt(1_000_000)),
    vanishMode: backendChat.vanishMode,
    typing: Object.fromEntries(backendChat.typing),
    pinned: Object.fromEntries(backendChat.pinned),
    archived: Object.fromEntries(backendChat.archived),
    muted: Object.fromEntries(backendChat.muted),
  };
}

function backendMsgToFrontend(msg: BackendMessage, chatId: string): Message {
  // Use exact backend message ID format: chatId_nanosecondTimestamp
  // This matches Motoko's generateMessageId: chatId # "_" # Int.toText(timestamp)
  const clientId = `${chatId}_${msg.createdAt.toString()}`;
  return {
    id: clientId,
    chatId,
    senderId: msg.senderId.toString(),
    text: msg.text,
    mediaUrl: msg.mediaUrl || undefined,
    messageType: msg.messageType as MessageType,
    createdAt: Number(msg.createdAt / BigInt(1_000_000)),
    seenBy: msg.seenBy.map((p) => p.toString()),
    reactions: (() => {
      const merged: Record<string, string[]> = {};
      for (const [emoji, uids] of msg.reactions) {
        if (!merged[emoji]) merged[emoji] = [];
        for (const u of uids) {
          const s = u.toString();
          if (!merged[emoji].includes(s)) merged[emoji].push(s);
        }
      }
      return merged;
    })(),
    edited: msg.edited,
    editedAt: msg.editedAt
      ? Number(msg.editedAt / BigInt(1_000_000))
      : undefined,
    deletedForEveryone: msg.deletedForEveryone,
    deletedFor: [], // client-side only
    replyTo: msg.replyTo || undefined,
    vanish: msg.vanish,
  };
}

// ─── localStorage keys for "delete for me" (client-side only) ────────────────
const DELETED_FOR_ME_KEY = "linkr_deleted_for_me";

function getDeletedForMe(uid: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${DELETED_FOR_ME_KEY}_${uid}`);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveDeletedForMe(uid: string, set: Set<string>): void {
  localStorage.setItem(
    `${DELETED_FOR_ME_KEY}_${uid}`,
    JSON.stringify([...set]),
  );
}

// ─── Backend GroupChat conversion ─────────────────────────────────────────────

function backendGroupChatToFrontend(bg: BackendGroupChat): GroupChat {
  return {
    id: bg.id,
    name: bg.name,
    description: bg.description,
    adminId: bg.adminId.toString(),
    members: bg.members.map((m) => m.toString()),
    createdAt: Number(bg.createdAt / BigInt(1_000_000)),
    lastMessage: bg.lastMessage ?? "",
    lastUpdated: Number(bg.lastUpdated / BigInt(1_000_000)),
    typing: Object.fromEntries(bg.typing),
  };
}

// ─── Context type ─────────────────────────────────────────────────────────────

interface ChatContextType {
  chats: Chat[];
  messages: Record<string, Message[]>;
  users: Record<string, AppUser>;
  requests: MessageRequest[];
  notifications: AppNotification[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  /** Map from chatId → otherUid, populated immediately by openChat so ChatWindow doesn't have to wait for chats state */
  chatIdToOtherUid: Record<string, string>;
  // Group chats
  groupChats: GroupChat[];
  groupMessages: Record<string, Message[]>;
  activeGroupChatId: string | null;
  setActiveGroupChatId: (id: string | null) => void;
  createGroupChat: (
    name: string,
    description: string,
    memberIds: string[],
  ) => Promise<GroupChat | null>;
  sendGroupMessage: (
    groupId: string,
    senderId: string,
    text: string,
    type?: MessageType,
    extra?: Partial<Message>,
  ) => Promise<Message>;
  markGroupSeen: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  setGroupTyping: (groupId: string, uid: string, isTyping: boolean) => void;
  sendMessage: (
    chatId: string,
    senderId: string,
    text: string,
    type?: MessageType,
    extra?: Partial<Message>,
  ) => Promise<Message>;
  editMessage: (
    chatId: string,
    messageId: string,
    newText: string,
  ) => Promise<void>;
  deleteMessageForEveryone: (
    chatId: string,
    messageId: string,
  ) => Promise<void>;
  deleteMessageForMe: (chatId: string, messageId: string, uid: string) => void;
  reactToMessage: (
    chatId: string,
    messageId: string,
    emoji: string,
    uid: string,
  ) => Promise<void>;
  forwardMessage: (
    message: Message,
    targetChatId: string,
    senderId: string,
  ) => Promise<void>;
  openChat: (
    currentUid: string,
    otherUid: string,
    knownUser?: AppUser,
  ) => Promise<{ chatId: string; isRequest: boolean }>;
  searchUsers: (prefix: string, excludeUid: string) => Promise<AppUser[]>;
  markSeen: (chatId: string, uid: string) => Promise<void>;
  setTyping: (chatId: string, uid: string, isTyping: boolean) => void;
  acceptRequest: (requestId: string) => void;
  declineRequest: (requestId: string) => void;
  markNotificationRead: (notifId: string) => void;
  markAllNotificationsRead: () => void;
  unreadCount: number;
  togglePin: (chatId: string, uid: string) => Promise<void>;
  toggleArchive: (chatId: string, uid: string) => Promise<void>;
  toggleMute: (chatId: string, uid: string) => Promise<void>;
  toggleVanishMode: (chatId: string) => Promise<void>;
  loadChatMessages: (chatId: string) => void;
  refreshChats: () => void;
  isLoadingChats: boolean;
  // Follow system
  followRequests: FollowRequest[];
  sendFollowRequest: (targetUid: string, targetUsername?: string) => void;
  acceptFollowRequest: (requestId: string) => Promise<void>;
  declineFollowRequest: (requestId: string) => void;
  cancelFollowRequestFn: (targetUid: string) => void;
  followUser: (targetUid: string) => Promise<void>;
  unfollowUser: (targetUid: string) => Promise<void>;
  refreshFollowRequests: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ChatProvider({
  children,
  currentUid,
}: {
  children: React.ReactNode;
  currentUid: string;
}) {
  const { actor, isFetching } = useActor();

  // Chats from ICP, keyed by chatId
  const [chats, setChats] = useState<Chat[]>([]);
  // Messages keyed by chatId
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  // Users cache (from localStorage + ICP)
  const [users, setUsers] = useState<Record<string, AppUser>>(() => getUsers());
  const [requests, setRequests] = useState<MessageRequest[]>(() =>
    getRequests(),
  );
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    getNotifications(),
  );
  const [activeChatId, setActiveChatIdState] = useState<string | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(false);

  // Group chats
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [groupMessages, setGroupMessages] = useState<Record<string, Message[]>>(
    {},
  );
  const [activeGroupChatId, setActiveGroupChatIdState] = useState<
    string | null
  >(null);

  const [followRequests, setFollowRequests] = useState<FollowRequest[]>(() =>
    getFollowRequests(),
  );

  // chatId → otherUid map: populated immediately by openChat so ChatWindow doesn't stall
  const [chatIdToOtherUid, setChatIdToOtherUid] = useState<
    Record<string, string>
  >({});

  // Polling refs
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  const messagesPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const groupPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const groupMsgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageTimestampRef = useRef<Record<string, bigint>>({});
  // Refs to avoid stale closures in polling callbacks
  const activeChatIdRef = useRef<string | null>(null);
  const activeGroupChatIdRef = useRef<string | null>(null);
  const groupChatsRef = useRef<GroupChat[]>([]);
  const setActiveGroupChatIdRef = useRef<((id: string | null) => void) | null>(
    null,
  );

  // Track deleted-for-me per user (client-side)
  const deletedForMeRef = useRef<Set<string>>(getDeletedForMe(currentUid));

  // ─── Load chats from ICP ──────────────────────────────────────────────────

  const fetchChats = useCallback(async () => {
    if (!actor || isFetching) return;
    try {
      const backendChats = await actor.getMyChats();
      const frontendChats: Chat[] = [];
      const newUsers: Record<string, AppUser> = { ...getUsers() };

      for (const bc of backendChats) {
        const participants = bc.participants.map((p) => p.toString());
        const chatId = generateChatId(participants[0], participants[1]);

        // Fetch participant profiles we don't have yet
        for (const p of bc.participants) {
          const uid = p.toString();
          if (!newUsers[uid] && uid !== currentUid) {
            try {
              const profile = await actor.getUserProfile(p);
              if (profile) {
                const user = backendProfileToAppUser(profile);
                newUsers[uid] = user;
                saveUser(user);
              }
            } catch {
              // ignore
            }
          }
        }

        // Determine last message text from cached messages
        const cached = messages[chatId] ?? [];
        const lastMsg = cached.at(-1);
        const lastMsgText = lastMsg?.deletedForEveryone
          ? "Message deleted"
          : lastMsg?.messageType !== "text" && lastMsg?.messageType
            ? `📎 ${lastMsg.messageType}`
            : (lastMsg?.text ?? "");

        frontendChats.push(backendChatToFrontend(bc, chatId, lastMsgText));
      }

      setChats(frontendChats);
      setUsers(newUsers);
    } catch {
      // Silently fail — keep previous state
    }
  }, [actor, isFetching, currentUid, messages]);

  // ─── Load messages for a chat ─────────────────────────────────────────────

  const fetchMessages = useCallback(
    async (chatId: string, afterTimestamp = 0n) => {
      if (!actor || isFetching) return;
      try {
        const backendMessages = await actor.getChatMessages(
          chatId,
          afterTimestamp,
        );
        if (backendMessages.length === 0) return;

        const deletedSet = deletedForMeRef.current;
        const converted = backendMessages.map((m) =>
          backendMsgToFrontend(m, chatId),
        );

        // Apply client-side deletedFor
        const withDeletedFor = converted.map((m) => ({
          ...m,
          deletedFor: deletedSet.has(m.id) ? [currentUid] : [],
        }));

        if (afterTimestamp === 0n) {
          // Full refresh — preserve locally deleted messages and detect backend-deleted ones
          setMessages((prev) => {
            const existing = prev[chatId] ?? [];
            const newIds = new Set(withDeletedFor.map((m) => m.id));
            // Messages that existed before but are gone from backend = deleted for everyone
            const ghostDeleted = existing
              .filter(
                (m) =>
                  !m.deletedForEveryone &&
                  !newIds.has(m.id) &&
                  !m.id.startsWith("optimistic_"),
              )
              .map((m) => ({ ...m, deletedForEveryone: true, text: "" }));
            // Restore deletedFor flags from previous state (client-side only)
            const merged = withDeletedFor.map((m) => {
              const prevMsg = existing.find((e) => e.id === m.id);
              return prevMsg ? { ...m, deletedFor: prevMsg.deletedFor } : m;
            });
            const combined = [...merged, ...ghostDeleted].sort(
              (a, b) => a.createdAt - b.createdAt,
            );
            return { ...prev, [chatId]: combined };
          });
        } else {
          // Incremental: merge new messages AND update existing ones (seenBy, text, edited, deletedForEveryone)
          // Also fire browser notifications for new messages from others
          const currentUsers = getUsers();

          setMessages((prev) => {
            const existing = prev[chatId] ?? [];
            const existingIds = new Set(existing.map((m) => m.id));
            const newMsgs = withDeletedFor.filter(
              (m) => !existingIds.has(m.id),
            );

            // Fire browser notifications + in-app toasts for new messages from others
            for (const msg of newMsgs) {
              if (msg.senderId !== currentUid) {
                const senderName =
                  currentUsers[msg.senderId]?.username ?? "Someone";
                const msgType = msg.messageType as
                  | "text"
                  | "image"
                  | "video"
                  | "voice"
                  | "file"
                  | "gif";

                // Browser notification
                showMessageNotification(
                  senderName,
                  msg.text,
                  chatId,
                  msgType,
                  activeChatIdRef.current,
                  () => {
                    setActiveChatId(chatId);
                  },
                );

                // In-app sonner toast (only when this chat is not active)
                if (activeChatIdRef.current !== chatId) {
                  const preview =
                    msgType !== "text"
                      ? msgType === "voice"
                        ? "🎤 Voice message"
                        : msgType === "image"
                          ? "📷 Photo"
                          : msgType === "video"
                            ? "🎥 Video"
                            : `📎 ${msgType}`
                      : msg.text.length > 60
                        ? `${msg.text.slice(0, 60)}…`
                        : msg.text;

                  toast(`💬 ${senderName}: ${preview}`, {
                    description: "Tap to open",
                    duration: 4000,
                    action: {
                      label: "Open",
                      onClick: () => setActiveChatId(chatId),
                    },
                  });
                }
              }
            }

            // Also update existing messages with any changes (seen, edit, delete)
            const updatedExisting = existing.map((m) => {
              const updated = withDeletedFor.find((nm) => nm.id === m.id);
              if (updated) {
                const hasChanges =
                  updated.seenBy.length > m.seenBy.length ||
                  updated.deletedForEveryone !== m.deletedForEveryone ||
                  updated.text !== m.text ||
                  updated.edited !== m.edited ||
                  Object.keys(updated.reactions).length !==
                    Object.keys(m.reactions).length;
                if (hasChanges) {
                  return {
                    ...m,
                    seenBy: updated.seenBy,
                    deletedForEveryone: updated.deletedForEveryone,
                    text: updated.text,
                    edited: updated.edited,
                    editedAt: updated.editedAt,
                    reactions: updated.reactions,
                  };
                }
              }
              return m;
            });
            if (
              newMsgs.length === 0 &&
              updatedExisting.every((m, i) => m === existing[i])
            )
              return prev;
            return { ...prev, [chatId]: [...updatedExisting, ...newMsgs] };
          });
        }

        // Update last timestamp
        const latestTs = backendMessages.reduce(
          (max, m) => (m.createdAt > max ? m.createdAt : max),
          afterTimestamp,
        );
        lastMessageTimestampRef.current[chatId] = latestTs;

        // Update chat last message in sidebar
        setChats((prev) =>
          prev.map((c) => {
            if (c.id !== chatId) return c;
            const last = withDeletedFor.at(-1);
            if (!last) return c;
            const text = last.deletedForEveryone
              ? "Message deleted"
              : last.messageType !== "text"
                ? `📎 ${last.messageType}`
                : last.text;
            return {
              ...c,
              lastMessage: text,
              lastUpdated: last.createdAt,
            };
          }),
        );
      } catch {
        // Silently fail
      }
    },
    [actor, isFetching, currentUid],
  );

  // ─── Poll typing status ───────────────────────────────────────────────────

  const fetchTypingStatus = useCallback(
    async (chatId: string) => {
      if (!actor || isFetching) return;
      try {
        const typingStatus = await actor.getTypingStatus(chatId);
        const typingMap = Object.fromEntries(typingStatus);
        setChats((prev) =>
          prev.map((c) => (c.id === chatId ? { ...c, typing: typingMap } : c)),
        );
      } catch {
        // Silently fail
      }
    },
    [actor, isFetching],
  );

  // ─── Initial load ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!actor || isFetching) return;
    setIsLoadingChats(true);
    fetchChats().finally(() => setIsLoadingChats(false));
  }, [actor, isFetching, fetchChats]);

  // ─── Poll chats list every 2s ─────────────────────────────────────────────

  useEffect(() => {
    if (!actor || isFetching) return;

    chatsPollRef.current = setInterval(() => {
      fetchChats();
    }, 1200);

    return () => {
      if (chatsPollRef.current) clearInterval(chatsPollRef.current);
    };
  }, [actor, isFetching, fetchChats]);

  // ─── Poll active chat messages every 800ms ────────────────────────────────

  const fullRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  useEffect(() => {
    if (!actor || isFetching || !activeChatId) return;

    // Initial load of messages for active chat
    fetchMessages(activeChatId, 0n);

    // Start polling for new messages
    messagesPollRef.current = setInterval(() => {
      const lastTs = lastMessageTimestampRef.current[activeChatId] ?? 0n;
      fetchMessages(activeChatId, lastTs);
    }, 500);

    // Full refresh every 2 seconds to catch any missed updates (seen, edits, reactions)
    fullRefreshIntervalRef.current = setInterval(() => {
      fetchMessages(activeChatId, 0n);
    }, 2000);

    return () => {
      if (messagesPollRef.current) clearInterval(messagesPollRef.current);
      if (fullRefreshIntervalRef.current)
        clearInterval(fullRefreshIntervalRef.current);
    };
  }, [actor, isFetching, activeChatId, fetchMessages]);

  // ─── Poll typing status every 800ms when chat is open ───────────────────────

  useEffect(() => {
    if (!actor || isFetching || !activeChatId) return;

    typingPollRef.current = setInterval(() => {
      fetchTypingStatus(activeChatId);
    }, 500);

    return () => {
      if (typingPollRef.current) clearInterval(typingPollRef.current);
    };
  }, [actor, isFetching, activeChatId, fetchTypingStatus]);

  // ─── loadChatMessages (manual trigger) ───────────────────────────────────

  const loadChatMessages = useCallback(
    (chatId: string) => {
      fetchMessages(chatId, 0n);
    },
    [fetchMessages],
  );

  const refreshChats = useCallback(() => {
    fetchChats();
    setUsers(getUsers());
  }, [fetchChats]);

  // ─── setActiveChatId ──────────────────────────────────────────────────────

  const setActiveChatId = useCallback(
    (id: string | null) => {
      activeChatIdRef.current = id;
      setActiveChatIdState(id);
      if (id) {
        lastMessageTimestampRef.current[id] = 0n;
        fetchMessages(id, 0n);
      }
    },
    [fetchMessages],
  );

  // ─── sendMessage ──────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (
      chatId: string,
      senderId: string,
      text: string,
      type: MessageType = "text",
      extra?: Partial<Message>,
    ): Promise<Message> => {
      // Optimistic UI: add message immediately
      const optimisticId = `optimistic_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const optimisticMsg: Message = {
        id: optimisticId,
        chatId,
        senderId,
        text,
        messageType: type,
        createdAt: Date.now(),
        seenBy: [senderId],
        reactions: {},
        edited: false,
        deletedForEveryone: false,
        deletedFor: [],
        vanish: false,
        mediaUrl: extra?.mediaUrl,
        mediaName: extra?.mediaName,
        replyTo: extra?.replyTo,
        ...extra,
      };

      setMessages((prev) => ({
        ...prev,
        [chatId]: [...(prev[chatId] ?? []), optimisticMsg],
      }));
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                lastMessage: text || `📎 ${type}`,
                lastUpdated: Date.now(),
              }
            : c,
        ),
      );

      if (!actor) return optimisticMsg;

      try {
        const backendMsg = await actor.sendMessage(
          chatId,
          text,
          type,
          extra?.mediaUrl ?? "",
          extra?.replyTo ?? "",
        );

        // Replace optimistic with real message
        const realMsg = backendMsgToFrontend(backendMsg, chatId);
        setMessages((prev) => {
          const chatMsgs = prev[chatId] ?? [];
          const filtered = chatMsgs.filter((m) => m.id !== optimisticId);
          // Avoid duplicates
          const exists = filtered.some((m) => m.id === realMsg.id);
          return {
            ...prev,
            [chatId]: exists ? filtered : [...filtered, realMsg],
          };
        });

        // Update last timestamp
        lastMessageTimestampRef.current[chatId] = backendMsg.createdAt;

        // Add notification for other participants
        const chat = chats.find((c) => c.id === chatId);
        if (chat) {
          const receivers = chat.participants.filter((p) => p !== senderId);
          const currentUsers = getUsers();
          for (const receiverId of receivers) {
            const notif: AppNotification = {
              id: generateId(),
              type: "message",
              senderId,
              receiverId,
              chatId,
              messageId: realMsg.id,
              read: false,
              createdAt: Date.now(),
              text: `New message from ${currentUsers[senderId]?.username ?? "someone"}`,
            };
            addNotification(notif);
            if (receiverId === currentUid) {
              setNotifications(getNotifications());
            }
          }
        }

        return realMsg;
      } catch (err) {
        // Remove optimistic on failure
        setMessages((prev) => ({
          ...prev,
          [chatId]: (prev[chatId] ?? []).filter((m) => m.id !== optimisticId),
        }));
        throw err;
      }
    },
    [actor, chats, currentUid],
  );

  // ─── editMessage ──────────────────────────────────────────────────────────

  const editMessage = useCallback(
    async (chatId: string, messageId: string, newText: string) => {
      // Optimistic update
      setMessages((prev) => ({
        ...prev,
        [chatId]: (prev[chatId] ?? []).map((m) =>
          m.id === messageId
            ? { ...m, text: newText, edited: true, editedAt: Date.now() }
            : m,
        ),
      }));

      if (!actor) return;
      try {
        await actor.editMessage(chatId, messageId, newText);
        // Refresh messages to confirm
        setTimeout(() => fetchMessages(chatId, 0n), 500);
      } catch {
        // Revert optimistic on failure
        fetchMessages(chatId, 0n);
      }
    },
    [actor, fetchMessages],
  );

  // ─── deleteMessageForEveryone ─────────────────────────────────────────────

  const deleteMessageForEveryone = useCallback(
    async (chatId: string, messageId: string) => {
      // Optimistic update
      setMessages((prev) => ({
        ...prev,
        [chatId]: (prev[chatId] ?? []).map((m) =>
          m.id === messageId ? { ...m, deletedForEveryone: true, text: "" } : m,
        ),
      }));

      if (!actor) return;
      try {
        await actor.deleteMessageForEveryone(chatId, messageId);
        // Refresh to confirm the delete propagated to all clients
        setTimeout(() => fetchMessages(chatId, 0n), 500);
      } catch {
        fetchMessages(chatId, 0n);
      }
    },
    [actor, fetchMessages],
  );

  // ─── deleteMessageForMe (client-side only) ────────────────────────────────

  const deleteMessageForMe = useCallback(
    (chatId: string, messageId: string, uid: string) => {
      deletedForMeRef.current.add(messageId);
      saveDeletedForMe(uid, deletedForMeRef.current);
      setMessages((prev) => ({
        ...prev,
        [chatId]: (prev[chatId] ?? []).map((m) =>
          m.id === messageId ? { ...m, deletedFor: [uid] } : m,
        ),
      }));
    },
    [],
  );

  // ─── reactToMessage ───────────────────────────────────────────────────────

  const reactToMessage = useCallback(
    async (chatId: string, messageId: string, emoji: string, uid: string) => {
      if (!actor) return;

      // Read the CURRENT state BEFORE optimistic update to determine add vs remove
      // Use functional update so we can capture the before-state reliably
      let hadReactionBefore = false;
      setMessages((prev) => {
        const msgs = prev[chatId] ?? [];
        const msg = msgs.find((m) => m.id === messageId);
        if (!msg) return prev;

        // Capture the current reaction state (before toggle)
        hadReactionBefore = (msg.reactions[emoji] ?? []).includes(uid);

        // Apply optimistic toggle
        return {
          ...prev,
          [chatId]: msgs.map((m) => {
            if (m.id !== messageId) return m;
            const current = m.reactions[emoji] ?? [];
            const updated = hadReactionBefore
              ? current.filter((u) => u !== uid)
              : [...current, uid];
            const newReactions = { ...m.reactions, [emoji]: updated };
            if (updated.length === 0) delete newReactions[emoji];
            return { ...m, reactions: newReactions };
          }),
        };
      });

      // Wait for state update to complete, then send backend call
      await new Promise((r) => setTimeout(r, 0));

      try {
        if (hadReactionBefore) {
          await actor.removeReaction(chatId, messageId, emoji);
        } else {
          await actor.addReaction(chatId, messageId, emoji);
        }
        // Always refresh after backend call to get canonical reaction state
        setTimeout(() => fetchMessages(chatId, 0n), 300);
      } catch {
        // Revert
        fetchMessages(chatId, 0n);
      }
    },
    [actor, fetchMessages],
  );

  // ─── forwardMessage ───────────────────────────────────────────────────────

  const forwardMessage = useCallback(
    async (message: Message, targetChatId: string, senderId: string) => {
      await sendMessage(
        targetChatId,
        senderId,
        message.text,
        message.messageType,
        {
          mediaUrl: message.mediaUrl,
          mediaName: message.mediaName,
        },
      );
    },
    [sendMessage],
  );

  // ─── openChat ─────────────────────────────────────────────────────────────

  const openChat = useCallback(
    async (
      currentUid: string,
      otherUid: string,
      knownUser?: AppUser,
    ): Promise<{ chatId: string; isRequest: boolean }> => {
      const chatId = generateChatId(currentUid, otherUid);

      // Use knownUser if provided (e.g. from search results), else look up in state
      const otherUser = knownUser ?? users[otherUid];

      // Check if target user is private and current user is not a follower
      if (otherUser?.isPrivate) {
        const isFollower = otherUser.followers.includes(currentUid);
        if (!isFollower) {
          return { chatId, isRequest: true };
        }
      }

      if (!actor) {
        // Offline fallback — just set active
        if (otherUser) {
          setUsers((prev) => ({ ...prev, [otherUid]: otherUser }));
          saveUser(otherUser);
        }
        setActiveChatId(chatId);
        return { chatId, isRequest: false };
      }

      try {
        const otherPrincipal = Principal.fromText(otherUid);

        // Step 1: Fetch other user profile — always fetch fresh from backend
        let resolvedUser: AppUser | undefined = knownUser;
        try {
          const profile = await actor.getUserProfile(otherPrincipal);
          if (profile) {
            resolvedUser = backendProfileToAppUser(profile);
            saveUser(resolvedUser);
          }
        } catch {
          // Use cached user if fetch fails
          if (!resolvedUser) resolvedUser = users[otherUid];
        }

        // Step 2: Create/get chat on backend
        const backendChat = await actor.getOrCreateChat(otherPrincipal);
        const frontendChat = backendChatToFrontend(backendChat, chatId);

        // Step 3: Update state — user first, then chat, then set active
        // Use separate setState calls (no flushSync) to avoid React 18 batching issues
        if (resolvedUser) {
          setUsers((prev) => ({ ...prev, [otherUid]: resolvedUser! }));
        }
        setChats((prev) => {
          const exists = prev.some((c) => c.id === chatId);
          if (exists) {
            return prev.map((c) =>
              c.id === chatId ? { ...c, ...frontendChat } : c,
            );
          }
          return [...prev, frontendChat];
        });
        // Populate the chatId → otherUid map immediately so ChatWindow doesn't stall
        setChatIdToOtherUid((prev) => ({ ...prev, [chatId]: otherUid }));
        setActiveGroupChatIdState(null);
        activeChatIdRef.current = chatId;
        setActiveChatIdState(chatId);
        lastMessageTimestampRef.current[chatId] = 0n;
        // Fetch messages immediately
        setTimeout(() => fetchMessages(chatId, 0n), 50);

        return { chatId, isRequest: false };
      } catch {
        // Fallback: just set active chat if it already exists
        const existingChat = chats.find((c) => c.id === chatId);
        if (existingChat) {
          if (otherUser) {
            setUsers((prev) => ({ ...prev, [otherUid]: otherUser }));
          }
          setChatIdToOtherUid((prev) => ({ ...prev, [chatId]: otherUid }));
          setActiveChatId(chatId);
          return { chatId, isRequest: false };
        }

        // Check if private account → create request
        if (otherUser?.isPrivate) {
          const currentRequests = getRequests();
          const existingRequest = currentRequests.find(
            (r) =>
              r.senderId === currentUid &&
              r.receiverId === otherUid &&
              r.status === "pending",
          );
          if (!existingRequest) {
            const req: MessageRequest = {
              id: generateId(),
              senderId: currentUid,
              receiverId: otherUid,
              chatId,
              status: "pending",
              createdAt: Date.now(),
              previewMessage: "Would like to message you",
            };
            const updated = [...currentRequests, req];
            saveRequests(updated);
            setRequests(updated);
          }
          return { chatId, isRequest: true };
        }

        return { chatId, isRequest: false };
      }
    },
    [actor, chats, users, setActiveChatId, fetchMessages],
  );

  // ─── markSeen ────────────────────────────────────────────────────────────

  const markSeen = useCallback(
    async (chatId: string, uid: string) => {
      // Optimistic update
      setMessages((prev) => ({
        ...prev,
        [chatId]: (prev[chatId] ?? []).map((m) => ({
          ...m,
          seenBy: m.seenBy.includes(uid) ? m.seenBy : [...m.seenBy, uid],
        })),
      }));

      if (!actor) return;
      try {
        await actor.markMessagesSeen(chatId);
        // Immediately refresh to propagate seenBy to other participants
        setTimeout(() => fetchMessages(chatId, 0n), 200);
      } catch {
        // Ignore
      }
    },
    [actor, fetchMessages],
  );

  // ─── setTyping ────────────────────────────────────────────────────────────

  const setTyping = useCallback(
    (chatId: string, uid: string, isTyping: boolean) => {
      const key = `${chatId}_${uid}`;
      if (typingTimers.current[key]) clearTimeout(typingTimers.current[key]);

      // Update local state immediately
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? { ...c, typing: { ...c.typing, [uid]: isTyping } }
            : c,
        ),
      );

      // Tell the backend
      if (actor) {
        actor.setTypingStatus(chatId, isTyping).catch(() => {});
      }

      if (isTyping) {
        typingTimers.current[key] = setTimeout(() => {
          setChats((prev) =>
            prev.map((c) =>
              c.id === chatId
                ? { ...c, typing: { ...c.typing, [uid]: false } }
                : c,
            ),
          );
          if (actor) {
            actor.setTypingStatus(chatId, false).catch(() => {});
          }
        }, 1500);
      }
    },
    [actor],
  );

  // ─── acceptRequest ────────────────────────────────────────────────────────

  const acceptRequest = useCallback(
    (requestId: string) => {
      const req = requests.find((r) => r.id === requestId);
      if (!req) return;

      // Open chat via ICP
      openChat(req.receiverId, req.senderId);

      const updated = requests.map((r) =>
        r.id === requestId ? { ...r, status: "accepted" as const } : r,
      );
      saveRequests(updated);
      setRequests(updated);
    },
    [requests, openChat],
  );

  const declineRequest = useCallback(
    (requestId: string) => {
      const updated = requests.map((r) =>
        r.id === requestId ? { ...r, status: "declined" as const } : r,
      );
      saveRequests(updated);
      setRequests(updated);
    },
    [requests],
  );

  // ─── Notifications ────────────────────────────────────────────────────────

  const markNotificationRead = useCallback((notifId: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) =>
        n.id === notifId ? { ...n, read: true } : n,
      );
      saveNotifications(updated);
      return updated;
    });
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveNotifications(updated);
      return updated;
    });
  }, []);

  const unreadCount = notifications.filter(
    (n) => !n.read && n.receiverId === currentUid,
  ).length;

  // ─── Chat settings ────────────────────────────────────────────────────────

  const togglePin = useCallback(
    async (chatId: string, uid: string) => {
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? { ...c, pinned: { ...c.pinned, [uid]: !c.pinned[uid] } }
            : c,
        ),
      );
      if (actor) {
        try {
          await actor.togglePin(chatId);
        } catch {
          fetchChats();
        }
      }
    },
    [actor, fetchChats],
  );

  const toggleArchive = useCallback(
    async (chatId: string, uid: string) => {
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? { ...c, archived: { ...c.archived, [uid]: !c.archived[uid] } }
            : c,
        ),
      );
      if (actor) {
        try {
          await actor.toggleArchive(chatId);
        } catch {
          fetchChats();
        }
      }
    },
    [actor, fetchChats],
  );

  const toggleMute = useCallback(
    async (chatId: string, uid: string) => {
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? { ...c, muted: { ...c.muted, [uid]: !c.muted[uid] } }
            : c,
        ),
      );
      if (actor) {
        try {
          await actor.toggleMute(chatId);
        } catch {
          fetchChats();
        }
      }
    },
    [actor, fetchChats],
  );

  const toggleVanishMode = useCallback(
    async (chatId: string) => {
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId ? { ...c, vanishMode: !c.vanishMode } : c,
        ),
      );
      if (actor) {
        try {
          await actor.toggleVanishMode(chatId);
        } catch {
          fetchChats();
        }
      }
    },
    [actor, fetchChats],
  );

  // ─── Group chat functions ────────────────────────────────────────────────

  const fetchGroupChats = useCallback(async () => {
    if (!actor || isFetching) return;
    try {
      const backendGroups = await actor.getMyGroupChats();
      const frontendGroups = backendGroups.map(backendGroupChatToFrontend);

      // Fetch missing member profiles
      const newUsers: Record<string, AppUser> = { ...getUsers() };
      for (const group of backendGroups) {
        for (const member of group.members) {
          const uid = member.toString();
          if (!newUsers[uid] && uid !== currentUid) {
            try {
              const profile = await actor.getUserProfile(member);
              if (profile) {
                const user = backendProfileToAppUser(profile);
                newUsers[uid] = user;
                saveUser(user);
              }
            } catch {
              // ignore
            }
          }
        }
      }
      setGroupChats(frontendGroups);
      setUsers(newUsers);
    } catch {
      // silently fail
    }
  }, [actor, isFetching, currentUid]);

  const fetchGroupMessages = useCallback(
    async (groupId: string, afterTimestamp = 0n) => {
      if (!actor || isFetching) return;
      try {
        const backendMessages = await actor.getGroupMessages(
          groupId,
          afterTimestamp,
        );
        if (backendMessages.length === 0) return;

        const converted = backendMessages.map((m) =>
          backendMsgToFrontend(m, groupId),
        );

        if (afterTimestamp === 0n) {
          // Full refresh — preserve locally deleted messages and detect backend-deleted ones
          setGroupMessages((prev) => {
            const existing = prev[groupId] ?? [];
            const newIds = new Set(converted.map((m) => m.id));
            // Messages that existed before but are gone from backend = deleted for everyone
            const ghostDeleted = existing
              .filter(
                (m) =>
                  !m.deletedForEveryone &&
                  !newIds.has(m.id) &&
                  !m.id.startsWith("optimistic_"),
              )
              .map((m) => ({ ...m, deletedForEveryone: true, text: "" }));
            const combined = [...converted, ...ghostDeleted].sort(
              (a, b) => a.createdAt - b.createdAt,
            );
            return { ...prev, [groupId]: combined };
          });
        } else {
          const currentUsers = getUsers();

          setGroupMessages((prev) => {
            const existing = prev[groupId] ?? [];
            const existingIds = new Set(existing.map((m) => m.id));
            const newMsgs = converted.filter((m) => !existingIds.has(m.id));

            // Fire notifications for new group messages from others
            for (const msg of newMsgs) {
              if (msg.senderId !== currentUid) {
                const senderName =
                  currentUsers[msg.senderId]?.username ?? "Someone";
                const group = groupChatsRef.current.find(
                  (g) => g.id === groupId,
                );
                const groupName = group?.name ?? "Group";
                const msgType = msg.messageType as
                  | "text"
                  | "image"
                  | "video"
                  | "voice"
                  | "file"
                  | "gif";

                const openGroup = () => {
                  if (setActiveGroupChatIdRef.current) {
                    setActiveGroupChatIdRef.current(groupId);
                  }
                };

                // Browser notification
                showGroupNotification(
                  senderName,
                  groupName,
                  msg.text,
                  groupId,
                  msgType,
                  activeGroupChatIdRef.current,
                  openGroup,
                );

                // In-app toast (only when this group is not active)
                if (activeGroupChatIdRef.current !== groupId) {
                  const preview =
                    msgType !== "text"
                      ? msgType === "voice"
                        ? "🎤 Voice message"
                        : msgType === "image"
                          ? "📷 Photo"
                          : msgType === "video"
                            ? "🎥 Video"
                            : `📎 ${msgType}`
                      : msg.text.length > 60
                        ? `${msg.text.slice(0, 60)}…`
                        : msg.text;

                  toast(`💬 [${groupName}] ${senderName}: ${preview}`, {
                    description: "Tap to open",
                    duration: 4000,
                    action: {
                      label: "Open",
                      onClick: openGroup,
                    },
                  });
                }
              }
            }

            // Also update existing messages with changes (seen, edit, delete, reactions)
            const updatedExisting = existing.map((m) => {
              const updated = converted.find((nm) => nm.id === m.id);
              if (updated) {
                const hasChanges =
                  updated.seenBy.length > m.seenBy.length ||
                  updated.deletedForEveryone !== m.deletedForEveryone ||
                  updated.text !== m.text ||
                  updated.edited !== m.edited ||
                  Object.keys(updated.reactions).length !==
                    Object.keys(m.reactions).length;
                if (hasChanges) {
                  return {
                    ...m,
                    seenBy: updated.seenBy,
                    deletedForEveryone: updated.deletedForEveryone,
                    text: updated.text,
                    edited: updated.edited,
                    editedAt: updated.editedAt,
                    reactions: updated.reactions,
                  };
                }
              }
              return m;
            });
            if (
              newMsgs.length === 0 &&
              updatedExisting.every((m, i) => m === existing[i])
            )
              return prev;
            return { ...prev, [groupId]: [...updatedExisting, ...newMsgs] };
          });
        }

        const latestTs = backendMessages.reduce(
          (max, m) => (m.createdAt > max ? m.createdAt : max),
          afterTimestamp,
        );
        lastMessageTimestampRef.current[`group_${groupId}`] = latestTs;

        // Update group last message
        setGroupChats((prev) =>
          prev.map((g) => {
            if (g.id !== groupId) return g;
            const last = converted.at(-1);
            if (!last) return g;
            const text = last.deletedForEveryone
              ? "Message deleted"
              : last.messageType !== "text"
                ? `📎 ${last.messageType}`
                : last.text;
            return { ...g, lastMessage: text, lastUpdated: last.createdAt };
          }),
        );
      } catch {
        // silently fail
      }
    },
    [actor, isFetching, currentUid],
  );

  // Poll group chats every 2s
  useEffect(() => {
    if (!actor || isFetching) return;
    fetchGroupChats();
    groupPollRef.current = setInterval(() => {
      fetchGroupChats();
    }, 1200);
    return () => {
      if (groupPollRef.current) clearInterval(groupPollRef.current);
    };
  }, [actor, isFetching, fetchGroupChats]);

  // Poll active group messages every 800ms
  useEffect(() => {
    if (!actor || isFetching || !activeGroupChatId) return;

    fetchGroupMessages(activeGroupChatId, 0n);

    groupMsgPollRef.current = setInterval(() => {
      const lastTs =
        lastMessageTimestampRef.current[`group_${activeGroupChatId}`] ?? 0n;
      fetchGroupMessages(activeGroupChatId, lastTs);
    }, 500);

    return () => {
      if (groupMsgPollRef.current) clearInterval(groupMsgPollRef.current);
    };
  }, [actor, isFetching, activeGroupChatId, fetchGroupMessages]);

  const setActiveGroupChatId = useCallback(
    (id: string | null) => {
      activeGroupChatIdRef.current = id;
      setActiveGroupChatIdState(id);
      if (id) {
        lastMessageTimestampRef.current[`group_${id}`] = 0n;
        // Clear DM chat when group chat is opened
        activeChatIdRef.current = null;
        setActiveChatIdState(null);
        fetchGroupMessages(id, 0n);
      }
    },
    [fetchGroupMessages],
  );

  // Keep refs in sync so polling callbacks can access latest values without stale closure
  useEffect(() => {
    groupChatsRef.current = groupChats;
  }, [groupChats]);

  useEffect(() => {
    setActiveGroupChatIdRef.current = setActiveGroupChatId;
  }, [setActiveGroupChatId]);

  const createGroupChat = useCallback(
    async (
      name: string,
      description: string,
      memberIds: string[],
    ): Promise<GroupChat | null> => {
      if (!actor) return null;
      try {
        const principals = memberIds.map((uid) => Principal.fromText(uid));
        const groupId = await actor.createGroupChat(
          name,
          description,
          principals,
        );

        // Fetch the newly created group directly from the backend
        // instead of relying on stale groupChats state
        const backendGroup = await actor.getGroupById(groupId);
        if (backendGroup) {
          const frontendGroup = backendGroupChatToFrontend(backendGroup);
          setGroupChats((prev) => {
            const exists = prev.some((g) => g.id === groupId);
            if (exists) {
              return prev.map((g) => (g.id === groupId ? frontendGroup : g));
            }
            return [...prev, frontendGroup];
          });
          return frontendGroup;
        }

        // Fallback: trigger a full refresh and wait briefly
        await fetchGroupChats();
        // Give React state a moment to settle, then read from backend again
        const allGroups = await actor.getMyGroupChats();
        const found = allGroups.find((g) => g.id === groupId);
        return found ? backendGroupChatToFrontend(found) : null;
      } catch {
        return null;
      }
    },
    [actor, fetchGroupChats],
  );

  const sendGroupMessage = useCallback(
    async (
      groupId: string,
      senderId: string,
      text: string,
      type: MessageType = "text",
      extra?: Partial<Message>,
    ): Promise<Message> => {
      const optimisticId = `optimistic_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const optimisticMsg: Message = {
        id: optimisticId,
        chatId: groupId,
        senderId,
        text,
        messageType: type,
        createdAt: Date.now(),
        seenBy: [senderId],
        reactions: {},
        edited: false,
        deletedForEveryone: false,
        deletedFor: [],
        vanish: false,
        mediaUrl: extra?.mediaUrl,
        mediaName: extra?.mediaName,
        replyTo: extra?.replyTo,
        ...extra,
      };

      setGroupMessages((prev) => ({
        ...prev,
        [groupId]: [...(prev[groupId] ?? []), optimisticMsg],
      }));
      setGroupChats((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                lastMessage: text || `📎 ${type}`,
                lastUpdated: Date.now(),
              }
            : g,
        ),
      );

      if (!actor) return optimisticMsg;

      try {
        const backendMsg = await actor.sendGroupMessage(
          groupId,
          text,
          type,
          extra?.mediaUrl ?? "",
          extra?.replyTo ?? "",
        );
        const realMsg = backendMsgToFrontend(backendMsg, groupId);

        setGroupMessages((prev) => {
          const msgs = prev[groupId] ?? [];
          const filtered = msgs.filter((m) => m.id !== optimisticId);
          const exists = filtered.some((m) => m.id === realMsg.id);
          return {
            ...prev,
            [groupId]: exists ? filtered : [...filtered, realMsg],
          };
        });

        lastMessageTimestampRef.current[`group_${groupId}`] =
          backendMsg.createdAt;
        return realMsg;
      } catch (err) {
        setGroupMessages((prev) => ({
          ...prev,
          [groupId]: (prev[groupId] ?? []).filter((m) => m.id !== optimisticId),
        }));
        throw err;
      }
    },
    [actor],
  );

  const markGroupSeen = useCallback(
    async (groupId: string) => {
      setGroupMessages((prev) => ({
        ...prev,
        [groupId]: (prev[groupId] ?? []).map((m) => ({
          ...m,
          seenBy: m.seenBy.includes(currentUid)
            ? m.seenBy
            : [...m.seenBy, currentUid],
        })),
      }));
      if (!actor) return;
      try {
        await actor.markGroupMessagesSeen(groupId);
      } catch {
        // ignore
      }
    },
    [actor, currentUid],
  );

  const leaveGroup = useCallback(
    async (groupId: string) => {
      if (!actor) return;
      try {
        await actor.leaveGroup(groupId);
        setGroupChats((prev) => prev.filter((g) => g.id !== groupId));
        if (activeGroupChatId === groupId) {
          setActiveGroupChatIdState(null);
        }
      } catch {
        // ignore
      }
    },
    [actor, activeGroupChatId],
  );

  const setGroupTyping = useCallback(
    (groupId: string, uid: string, isTyping: boolean) => {
      setGroupChats((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, typing: { ...g.typing, [uid]: isTyping } }
            : g,
        ),
      );
      if (actor) {
        actor.setGroupTypingStatus(groupId, isTyping).catch(() => {});
      }
    },
    [actor],
  );

  // ─── Follow system ────────────────────────────────────────────────────────

  const refreshFollowRequests = useCallback(() => {
    setFollowRequests(getFollowRequests());
  }, []);

  const sendFollowRequest = useCallback(
    (targetUid: string, targetUsername?: string) => {
      const req: FollowRequest = {
        id: generateFollowRequestId(),
        senderId: currentUid,
        receiverId: targetUid,
        senderUsername: targetUsername,
        status: "pending",
        createdAt: Date.now(),
      };
      addFollowRequest(req);
      setFollowRequests(getFollowRequests());
    },
    [currentUid],
  );

  const acceptFollowRequest = useCallback(
    async (requestId: string) => {
      const req = getFollowRequests().find((r) => r.id === requestId);
      if (!req) return;
      updateRequestStatus(requestId, "accepted");
      setFollowRequests(getFollowRequests());

      // Update users state: add sender to our followers, we to their following
      setUsers((prev) => {
        const updated = { ...prev };
        const me = updated[currentUid];
        const sender = updated[req.senderId];
        if (me && !me.followers.includes(req.senderId)) {
          updated[currentUid] = {
            ...me,
            followers: [...me.followers, req.senderId],
          };
          saveUser(updated[currentUid]);
        }
        if (sender && !sender.following.includes(currentUid)) {
          updated[req.senderId] = {
            ...sender,
            following: [...sender.following, currentUid],
          };
          saveUser(updated[req.senderId]);
        }
        return updated;
      });

      // Backend: accept follow (follow the sender so the backend records it)
      if (actor) {
        try {
          await actor.followUser(Principal.fromText(req.senderId));
        } catch {
          // Ignore backend errors
        }
      }
    },
    [actor, currentUid],
  );

  const declineFollowRequest = useCallback((requestId: string) => {
    updateRequestStatus(requestId, "declined");
    setFollowRequests(getFollowRequests());
  }, []);

  const cancelFollowRequestFn = useCallback(
    (targetUid: string) => {
      cancelFollowRequest(currentUid, targetUid);
      setFollowRequests(getFollowRequests());
    },
    [currentUid],
  );

  const followUser = useCallback(
    async (targetUid: string) => {
      if (!actor) return;
      try {
        await actor.followUser(Principal.fromText(targetUid));
        // Update local user state
        setUsers((prev) => {
          const updated = { ...prev };
          const me = updated[currentUid];
          const target = updated[targetUid];
          if (me && !me.following.includes(targetUid)) {
            updated[currentUid] = {
              ...me,
              following: [...me.following, targetUid],
            };
            saveUser(updated[currentUid]);
          }
          if (target && !target.followers.includes(currentUid)) {
            updated[targetUid] = {
              ...target,
              followers: [...target.followers, currentUid],
            };
            saveUser(updated[targetUid]);
          }
          return updated;
        });
      } catch {
        // Ignore
      }
    },
    [actor, currentUid],
  );

  const unfollowUser = useCallback(
    async (targetUid: string) => {
      if (!actor) return;
      try {
        await actor.unfollowUser(Principal.fromText(targetUid));
        // Update local user state
        setUsers((prev) => {
          const updated = { ...prev };
          const me = updated[currentUid];
          const target = updated[targetUid];
          if (me) {
            updated[currentUid] = {
              ...me,
              following: me.following.filter((uid) => uid !== targetUid),
            };
            saveUser(updated[currentUid]);
          }
          if (target) {
            updated[targetUid] = {
              ...target,
              followers: target.followers.filter((uid) => uid !== currentUid),
            };
            saveUser(updated[targetUid]);
          }
          return updated;
        });
      } catch {
        // Ignore
      }
    },
    [actor, currentUid],
  );

  // ─── searchUsers ──────────────────────────────────────────────────────────

  const searchUsers = useCallback(
    async (prefix: string, excludeUid: string): Promise<AppUser[]> => {
      if (!prefix.trim()) return [];

      if (actor) {
        try {
          const trimmed = prefix.trim();
          const lower = trimmed.toLowerCase();
          const upper = trimmed.toUpperCase();
          const capitalized =
            trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();

          // Try multiple casings in parallel to handle case-insensitive search
          // since the backend does case-sensitive prefix matching.
          // Also use searchUsersByUsername (contains) as a fallback.
          const [
            prefixResults,
            lowerResults,
            upperResults,
            capResults,
            containsResults,
          ] = await Promise.allSettled([
            actor.searchUsersByUsernamePrefix(trimmed),
            lower !== trimmed
              ? actor.searchUsersByUsernamePrefix(lower)
              : Promise.resolve([]),
            upper !== trimmed
              ? actor.searchUsersByUsernamePrefix(upper)
              : Promise.resolve([]),
            capitalized !== trimmed &&
            capitalized !== lower &&
            capitalized !== upper
              ? actor.searchUsersByUsernamePrefix(capitalized)
              : Promise.resolve([]),
            actor.searchUsersByUsername(trimmed),
          ]);

          // Merge all results, deduplicating by uid
          const seen = new Set<string>();
          const merged: import("../backend.d").UserProfile[] = [];
          for (const res of [
            prefixResults,
            lowerResults,
            upperResults,
            capResults,
            containsResults,
          ]) {
            if (res.status === "fulfilled") {
              for (const p of res.value) {
                const uid = p._id.toString();
                if (!seen.has(uid)) {
                  seen.add(uid);
                  merged.push(p);
                }
              }
            }
          }

          const appUsers: AppUser[] = merged
            .filter((p) => p._id.toString() !== excludeUid)
            .map((profile) => {
              const user = backendProfileToAppUser(profile);
              saveUser(user);
              return user;
            });

          // Sort: exact matches first, then prefix matches, then contains
          const tl = trimmed.toLowerCase();
          appUsers.sort((a, b) => {
            const al = a.username.toLowerCase();
            const bl = b.username.toLowerCase();
            const aExact = al === tl ? 0 : al.startsWith(tl) ? 1 : 2;
            const bExact = bl === tl ? 0 : bl.startsWith(tl) ? 1 : 2;
            if (aExact !== bExact) return aExact - bExact;
            return al.localeCompare(bl);
          });

          // Update users state
          setUsers((prev) => {
            const updated = { ...prev };
            for (const u of appUsers) {
              updated[u.uid] = u;
            }
            return updated;
          });

          return appUsers;
        } catch {
          // Fall through to local search
        }
      }

      return localSearchUsers(prefix, excludeUid);
    },
    [actor],
  );

  return (
    <ChatContext.Provider
      value={{
        chats,
        messages,
        users,
        requests,
        notifications,
        activeChatId,
        setActiveChatId,
        chatIdToOtherUid,
        // Group chats
        groupChats,
        groupMessages,
        activeGroupChatId,
        setActiveGroupChatId,
        createGroupChat,
        sendGroupMessage,
        markGroupSeen,
        leaveGroup,
        setGroupTyping,
        sendMessage,
        editMessage,
        deleteMessageForEveryone,
        deleteMessageForMe,
        reactToMessage,
        forwardMessage,
        openChat,
        searchUsers,
        markSeen,
        setTyping,
        acceptRequest,
        declineRequest,
        markNotificationRead,
        markAllNotificationsRead,
        unreadCount,
        togglePin,
        toggleArchive,
        toggleMute,
        toggleVanishMode,
        loadChatMessages,
        refreshChats,
        isLoadingChats,
        followRequests,
        sendFollowRequest,
        acceptFollowRequest,
        declineFollowRequest,
        cancelFollowRequestFn,
        followUser,
        unfollowUser,
        refreshFollowRequests,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextType {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
