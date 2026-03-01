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
import type {
  Chat as BackendChat,
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
import type {
  AppNotification,
  AppUser,
  Chat,
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
  const clientId = `${chatId}_${msg.createdAt.toString()}_${msg.senderId.toString().slice(-8)}`;
  return {
    id: clientId,
    chatId,
    senderId: msg.senderId.toString(),
    text: msg.text,
    mediaUrl: msg.mediaUrl || undefined,
    messageType: msg.messageType as MessageType,
    createdAt: Number(msg.createdAt / BigInt(1_000_000)),
    seenBy: msg.seenBy.map((p) => p.toString()),
    reactions: Object.fromEntries(
      msg.reactions.map(([emoji, uids]) => [
        emoji,
        uids.map((p) => p.toString()),
      ]),
    ),
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

// ─── Context type ─────────────────────────────────────────────────────────────

interface ChatContextType {
  chats: Chat[];
  messages: Record<string, Message[]>;
  users: Record<string, AppUser>;
  requests: MessageRequest[];
  notifications: AppNotification[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
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

  // Polling refs
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  const messagesPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageTimestampRef = useRef<Record<string, bigint>>({});

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
          // Full refresh
          setMessages((prev) => ({ ...prev, [chatId]: withDeletedFor }));
        } else {
          // Incremental: merge new messages
          setMessages((prev) => {
            const existing = prev[chatId] ?? [];
            const existingIds = new Set(existing.map((m) => m.id));
            const newMsgs = withDeletedFor.filter(
              (m) => !existingIds.has(m.id),
            );
            if (newMsgs.length === 0) return prev;
            return { ...prev, [chatId]: [...existing, ...newMsgs] };
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

  // ─── Poll chats list every 3s ─────────────────────────────────────────────

  useEffect(() => {
    if (!actor || isFetching) return;

    chatsPollRef.current = setInterval(() => {
      fetchChats();
    }, 3000);

    return () => {
      if (chatsPollRef.current) clearInterval(chatsPollRef.current);
    };
  }, [actor, isFetching, fetchChats]);

  // ─── Poll active chat messages every 1.5s ────────────────────────────────

  useEffect(() => {
    if (!actor || isFetching || !activeChatId) return;

    // Initial load of messages for active chat
    fetchMessages(activeChatId, 0n);

    // Start polling for new messages
    messagesPollRef.current = setInterval(() => {
      const lastTs = lastMessageTimestampRef.current[activeChatId] ?? 0n;
      fetchMessages(activeChatId, lastTs);
    }, 1500);

    return () => {
      if (messagesPollRef.current) clearInterval(messagesPollRef.current);
    };
  }, [actor, isFetching, activeChatId, fetchMessages]);

  // ─── Poll typing status every 1s when chat is open ───────────────────────

  useEffect(() => {
    if (!actor || isFetching || !activeChatId) return;

    typingPollRef.current = setInterval(() => {
      fetchTypingStatus(activeChatId);
    }, 1000);

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

      // Optimistic toggle
      setMessages((prev) => {
        const msgs = prev[chatId] ?? [];
        return {
          ...prev,
          [chatId]: msgs.map((m) => {
            if (m.id !== messageId) return m;
            const current = m.reactions[emoji] ?? [];
            const updated = current.includes(uid)
              ? current.filter((u) => u !== uid)
              : [...current, uid];
            const newReactions = { ...m.reactions, [emoji]: updated };
            if (updated.length === 0) delete newReactions[emoji];
            return { ...m, reactions: newReactions };
          }),
        };
      });

      const msgs = messages[chatId] ?? [];
      const msg = msgs.find((m) => m.id === messageId);
      if (!msg) return;

      try {
        const hasReacted = (msg.reactions[emoji] ?? []).includes(uid);
        if (hasReacted) {
          await actor.removeReaction(chatId, messageId, emoji);
        } else {
          await actor.addReaction(chatId, messageId, emoji);
        }
      } catch {
        // Revert
        fetchMessages(chatId, 0n);
      }
    },
    [actor, messages, fetchMessages],
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
    ): Promise<{ chatId: string; isRequest: boolean }> => {
      const chatId = generateChatId(currentUid, otherUid);

      if (!actor) {
        // Offline fallback — just set active
        setActiveChatId(chatId);
        return { chatId, isRequest: false };
      }

      try {
        const otherPrincipal = Principal.fromText(otherUid);
        const backendChat = await actor.getOrCreateChat(otherPrincipal);

        // Convert and add to state
        const frontendChat = backendChatToFrontend(backendChat, chatId);

        setChats((prev) => {
          const exists = prev.some((c) => c.id === chatId);
          if (exists) {
            return prev.map((c) =>
              c.id === chatId ? { ...c, ...frontendChat } : c,
            );
          }
          return [...prev, frontendChat];
        });

        setActiveChatId(chatId);
        return { chatId, isRequest: false };
      } catch {
        // Fallback: just set active chat if it already exists
        const existingChat = chats.find((c) => c.id === chatId);
        if (existingChat) {
          setActiveChatId(chatId);
          return { chatId, isRequest: false };
        }

        // Check if private account → create request
        const otherUser = users[otherUid];
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
    [actor, chats, users, setActiveChatId],
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
      } catch {
        // Ignore
      }
    },
    [actor],
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

  // ─── searchUsers ──────────────────────────────────────────────────────────

  const searchUsers = useCallback(
    async (prefix: string, excludeUid: string): Promise<AppUser[]> => {
      if (!prefix.trim()) return [];

      if (actor) {
        try {
          const results = await actor.searchUsersByUsernamePrefix(
            prefix.trim(),
          );
          const appUsers: AppUser[] = results
            .filter((p) => p._id.toString() !== excludeUid)
            .map((profile) => {
              const user = backendProfileToAppUser(profile);
              // Cache in local storage
              saveUser(user);
              return user;
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
