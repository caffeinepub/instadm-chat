import type {
  AppNotification,
  AppUser,
  Chat,
  Message,
  MessageRequest,
  MessageType,
} from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function generateChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join("_");
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const KEYS = {
  users: "linkr_users",
  chats: "linkr_chats",
  messages: "linkr_messages",
  requests: "linkr_requests",
  notifications: "linkr_notifications",
  session: "linkr_session",
};

// ─── Load / Save ──────────────────────────────────────────────────────────────
export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Initialise store ─────────────────────────────────────────────────────────
export function initStore() {
  // Just ensure storage keys exist — no seeding
  if (!localStorage.getItem(KEYS.chats)) {
    saveToStorage(KEYS.chats, []);
  }
  if (!localStorage.getItem(KEYS.messages)) {
    saveToStorage(KEYS.messages, {});
  }
  if (!localStorage.getItem(KEYS.requests)) {
    saveToStorage(KEYS.requests, []);
  }
  if (!localStorage.getItem(KEYS.notifications)) {
    saveToStorage(KEYS.notifications, []);
  }
  if (!localStorage.getItem(KEYS.users)) {
    saveToStorage(KEYS.users, {});
  }
}

// ─── Session ──────────────────────────────────────────────────────────────────
export interface AppSession {
  uid: string;
  username: string;
}

export function getSession(): AppSession | null {
  return loadFromStorage<AppSession | null>(KEYS.session, null);
}

export function saveSession(session: AppSession): void {
  saveToStorage(KEYS.session, session);
}

export function clearSession(): void {
  localStorage.removeItem(KEYS.session);
}

// ─── User operations ──────────────────────────────────────────────────────────
export function getUsers(): Record<string, AppUser> {
  return loadFromStorage<Record<string, AppUser>>(KEYS.users, {});
}

export function getUser(uid: string): AppUser | undefined {
  return getUsers()[uid];
}

export function saveUser(user: AppUser): void {
  const users = getUsers();
  users[user.uid] = user;
  saveToStorage(KEYS.users, users);
}

export function searchUsers(prefix: string, excludeUid: string): AppUser[] {
  const users = getUsers();
  return Object.values(users).filter(
    (u) =>
      u.uid !== excludeUid &&
      u.username.toLowerCase().startsWith(prefix.toLowerCase()),
  );
}

// ─── Chat operations ──────────────────────────────────────────────────────────
export function getChats(): Chat[] {
  return loadFromStorage<Chat[]>(KEYS.chats, []);
}

export function saveChats(chats: Chat[]): void {
  saveToStorage(KEYS.chats, chats);
}

export function createChat(uid1: string, uid2: string): Chat {
  const chats = getChats();
  const id = generateChatId(uid1, uid2);
  const existing = chats.find((c) => c.id === id);
  if (existing) return existing;

  const chat: Chat = {
    id,
    participants: [uid1, uid2],
    createdAt: Date.now(),
    lastMessage: "",
    lastUpdated: Date.now(),
    vanishMode: false,
    typing: { [uid1]: false, [uid2]: false },
    pinned: { [uid1]: false, [uid2]: false },
    archived: { [uid1]: false, [uid2]: false },
    muted: { [uid1]: false, [uid2]: false },
  };
  chats.push(chat);
  saveChats(chats);
  return chat;
}

export function updateChat(chatId: string, updates: Partial<Chat>): void {
  const chats = getChats();
  const idx = chats.findIndex((c) => c.id === chatId);
  if (idx !== -1) {
    chats[idx] = { ...chats[idx], ...updates };
    saveChats(chats);
  }
}

// ─── Message operations ───────────────────────────────────────────────────────
export function getMessages(): Record<string, Message[]> {
  return loadFromStorage<Record<string, Message[]>>(KEYS.messages, {});
}

export function getChatMessages(chatId: string): Message[] {
  return getMessages()[chatId] ?? [];
}

export function saveMessage(msg: Message): void {
  const allMessages = getMessages();
  const chatMessages = allMessages[msg.chatId] ?? [];
  chatMessages.push(msg);
  allMessages[msg.chatId] = chatMessages;
  saveToStorage(KEYS.messages, allMessages);

  updateChat(msg.chatId, {
    lastMessage: msg.deletedForEveryone
      ? "Message deleted"
      : msg.messageType !== "text"
        ? `📎 ${msg.messageType}`
        : msg.text,
    lastUpdated: msg.createdAt,
  });
}

export function updateMessage(
  chatId: string,
  messageId: string,
  updates: Partial<Message>,
): void {
  const allMessages = getMessages();
  const chatMessages = allMessages[chatId] ?? [];
  const idx = chatMessages.findIndex((m) => m.id === messageId);
  if (idx !== -1) {
    chatMessages[idx] = { ...chatMessages[idx], ...updates };
    allMessages[chatId] = chatMessages;
    saveToStorage(KEYS.messages, allMessages);
  }
}

export function createMessage(
  chatId: string,
  senderId: string,
  text: string,
  messageType: MessageType = "text",
  extra?: Partial<Message>,
): Message {
  const msg: Message = {
    id: generateId(),
    chatId,
    senderId,
    text,
    messageType,
    createdAt: Date.now(),
    seenBy: [senderId],
    reactions: {},
    edited: false,
    deletedForEveryone: false,
    deletedFor: [],
    vanish: false,
    ...extra,
  };
  saveMessage(msg);
  return msg;
}

export function markMessagesAsSeen(chatId: string, uid: string): void {
  const allMessages = getMessages();
  const chatMessages = allMessages[chatId] ?? [];
  let changed = false;
  for (const msg of chatMessages) {
    if (!msg.seenBy.includes(uid)) {
      msg.seenBy.push(uid);
      changed = true;
    }
  }
  if (changed) {
    allMessages[chatId] = chatMessages;
    saveToStorage(KEYS.messages, allMessages);
  }
}

// ─── Message Requests ─────────────────────────────────────────────────────────
export function getRequests(): MessageRequest[] {
  return loadFromStorage<MessageRequest[]>(KEYS.requests, []);
}

export function saveRequests(requests: MessageRequest[]): void {
  saveToStorage(KEYS.requests, requests);
}

// ─── Notifications ────────────────────────────────────────────────────────────
export function getNotifications(): AppNotification[] {
  return loadFromStorage<AppNotification[]>(KEYS.notifications, []);
}

export function saveNotifications(notifications: AppNotification[]): void {
  saveToStorage(KEYS.notifications, notifications);
}

export function addNotification(notif: AppNotification): void {
  const notifs = getNotifications();
  notifs.unshift(notif);
  saveNotifications(notifs);
}
