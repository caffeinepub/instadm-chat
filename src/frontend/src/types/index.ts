// ─── User ────────────────────────────────────────────────────────────────────
export interface AppUser {
  uid: string;
  username: string;
  email: string;
  profilePicture: string;
  bio: string;
  isPrivate: boolean;
  onlineStatus: boolean;
  lastSeen: number; // timestamp ms
  blockedUsers: string[];
  followers: string[];
  following: string[];
  createdAt: number;
}

// ─── Message ─────────────────────────────────────────────────────────────────
export type MessageType = "text" | "image" | "video" | "voice" | "file" | "gif";

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  mediaUrl?: string;
  mediaName?: string;
  mediaDuration?: number; // seconds, for voice
  messageType: MessageType;
  createdAt: number;
  seenBy: string[];
  reactions: Record<string, string[]>; // emoji -> [uid, ...]
  edited: boolean;
  editedAt?: number;
  deletedForEveryone: boolean;
  deletedFor: string[]; // uids that deleted for themselves
  replyTo?: string; // messageId
  vanish: boolean;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export interface Chat {
  id: string;
  participants: string[];
  createdAt: number;
  lastMessage: string;
  lastUpdated: number;
  vanishMode: boolean;
  typing: Record<string, boolean>;
  pinned: Record<string, boolean>;
  archived: Record<string, boolean>;
  muted: Record<string, boolean>;
}

// ─── Message Request ──────────────────────────────────────────────────────────
export interface MessageRequest {
  id: string;
  senderId: string;
  receiverId: string;
  chatId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: number;
  previewMessage: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────
export type NotificationType = "message" | "request" | "reaction" | "follow";

export interface AppNotification {
  id: string;
  type: NotificationType;
  senderId: string;
  receiverId: string;
  chatId?: string;
  messageId?: string;
  read: boolean;
  createdAt: number;
  text: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthSession {
  uid: string;
  email: string;
  emailVerified: boolean;
  username: string;
}

// ─── Context types ─────────────────────────────────────────────────────────────
export interface ChatState {
  chats: Chat[];
  messages: Record<string, Message[]>;
  users: Record<string, AppUser>;
  requests: MessageRequest[];
  notifications: AppNotification[];
  activeChatId: string | null;
}
