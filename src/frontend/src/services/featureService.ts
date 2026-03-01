/**
 * featureService.ts
 * localStorage-backed service for new features:
 * Mood, Posts/Feed, Polls, Badges, Group Roles, Group Announcements, Self-Destruct
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type MoodOption =
  | "🟢 Available"
  | "🔴 Busy"
  | "🎮 Gaming"
  | "💼 At work"
  | "🌙 Away"
  | "🎵 Listening"
  | "✈️ Traveling"
  | "";

export interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  authorAvatar: string;
  text: string;
  mediaUrl?: string;
  hashtags: string[];
  likes: string[];
  comments: PostComment[];
  createdAt: number;
}

export interface PostComment {
  id: string;
  authorId: string;
  authorUsername: string;
  text: string;
  createdAt: number;
}

export interface Poll {
  id: string;
  chatId: string;
  question: string;
  options: string[];
  votes: Record<string, number>; // userId → option index
  createdAt: number;
  createdBy: string;
}

export type BadgeId =
  | "first_message"
  | "100_messages"
  | "group_creator"
  | "10_followers"
  | "explorer"
  | "poster";

export interface BadgeInfo {
  id: BadgeId;
  icon: string;
  name: string;
  description: string;
}

export const ALL_BADGES: BadgeInfo[] = [
  {
    id: "first_message",
    icon: "💬",
    name: "First Message",
    description: "Sent your first message",
  },
  {
    id: "100_messages",
    icon: "🏆",
    name: "Chat Champion",
    description: "Sent 100+ messages",
  },
  {
    id: "group_creator",
    icon: "👑",
    name: "Group Creator",
    description: "Created your first group",
  },
  {
    id: "10_followers",
    icon: "⭐",
    name: "Rising Star",
    description: "Reached 10 followers",
  },
  {
    id: "explorer",
    icon: "🧭",
    name: "Explorer",
    description: "Discovered the Explore page",
  },
  {
    id: "poster",
    icon: "📝",
    name: "Content Creator",
    description: "Made your first post",
  },
];

export type GroupRole = "admin" | "moderator" | "member";

export interface SelfDestructTimer {
  destroyAt: number;
  chatId: string;
}

// ─── Mood ─────────────────────────────────────────────────────────────────────

export function getMood(uid: string): MoodOption {
  try {
    return (localStorage.getItem(`linkr_mood_${uid}`) ?? "") as MoodOption;
  } catch {
    return "";
  }
}

export function setMood(uid: string, mood: MoodOption): void {
  try {
    if (mood) {
      localStorage.setItem(`linkr_mood_${uid}`, mood);
    } else {
      localStorage.removeItem(`linkr_mood_${uid}`);
    }
  } catch {
    // ignore
  }
}

// ─── Posts / Feed ─────────────────────────────────────────────────────────────

const POSTS_KEY = "linkr_posts";

export function getPosts(): Post[] {
  try {
    const raw = localStorage.getItem(POSTS_KEY);
    return raw ? (JSON.parse(raw) as Post[]) : [];
  } catch {
    return [];
  }
}

export function savePosts(posts: Post[]): void {
  try {
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  } catch {
    // ignore
  }
}

export function createPost(
  post: Omit<Post, "id" | "likes" | "comments">,
): Post {
  const newPost: Post = {
    ...post,
    id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    likes: [],
    comments: [],
  };
  const posts = getPosts();
  savePosts([newPost, ...posts]);
  return newPost;
}

export function togglePostLike(postId: string, uid: string): Post[] {
  const posts = getPosts();
  const updated = posts.map((p) => {
    if (p.id !== postId) return p;
    const liked = p.likes.includes(uid);
    return {
      ...p,
      likes: liked ? p.likes.filter((u) => u !== uid) : [...p.likes, uid],
    };
  });
  savePosts(updated);
  return updated;
}

export function addPostComment(
  postId: string,
  comment: Omit<PostComment, "id">,
): Post[] {
  const posts = getPosts();
  const updated = posts.map((p) => {
    if (p.id !== postId) return p;
    const newComment: PostComment = {
      ...comment,
      id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    return { ...p, comments: [...p.comments, newComment] };
  });
  savePosts(updated);
  return updated;
}

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[a-zA-Z0-9_]+/g) ?? [];
  return matches.map((h) => h.toLowerCase());
}

// ─── Polls ────────────────────────────────────────────────────────────────────

const POLLS_KEY = "linkr_polls";

export function getPolls(): Record<string, Poll> {
  try {
    const raw = localStorage.getItem(POLLS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Poll>) : {};
  } catch {
    return {};
  }
}

export function savePollsMap(polls: Record<string, Poll>): void {
  try {
    localStorage.setItem(POLLS_KEY, JSON.stringify(polls));
  } catch {
    // ignore
  }
}

export function createPoll(
  chatId: string,
  question: string,
  options: string[],
  createdBy: string,
): Poll {
  const poll: Poll = {
    id: `poll_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    chatId,
    question,
    options,
    votes: {},
    createdAt: Date.now(),
    createdBy,
  };
  const polls = getPolls();
  polls[poll.id] = poll;
  savePollsMap(polls);
  return poll;
}

export function votePoll(
  pollId: string,
  uid: string,
  optionIndex: number,
): Record<string, Poll> {
  const polls = getPolls();
  const poll = polls[pollId];
  if (!poll) return polls;
  const currentVote = poll.votes[uid];
  if (currentVote === optionIndex) {
    // Remove vote (toggle)
    const newVotes = { ...poll.votes };
    delete newVotes[uid];
    polls[pollId] = { ...poll, votes: newVotes };
  } else {
    polls[pollId] = { ...poll, votes: { ...poll.votes, [uid]: optionIndex } };
  }
  savePollsMap(polls);
  return polls;
}

export function getPollsForChat(chatId: string): Poll[] {
  const polls = getPolls();
  return Object.values(polls)
    .filter((p) => p.chatId === chatId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

// ─── Badges ───────────────────────────────────────────────────────────────────

export function getBadges(uid: string): BadgeId[] {
  try {
    const raw = localStorage.getItem(`linkr_badges_${uid}`);
    return raw ? (JSON.parse(raw) as BadgeId[]) : [];
  } catch {
    return [];
  }
}

export function awardBadge(uid: string, badgeId: BadgeId): boolean {
  const current = getBadges(uid);
  if (current.includes(badgeId)) return false; // already has it
  const updated = [...current, badgeId];
  localStorage.setItem(`linkr_badges_${uid}`, JSON.stringify(updated));
  return true; // newly awarded
}

export function getMsgCount(uid: string): number {
  try {
    return Number.parseInt(
      localStorage.getItem(`linkr_msg_count_${uid}`) ?? "0",
      10,
    );
  } catch {
    return 0;
  }
}

export function incrementMsgCount(uid: string): number {
  const count = getMsgCount(uid) + 1;
  localStorage.setItem(`linkr_msg_count_${uid}`, count.toString());
  return count;
}

// ─── Group Roles ──────────────────────────────────────────────────────────────

export function getGroupRoles(groupId: string): Record<string, GroupRole> {
  try {
    const raw = localStorage.getItem(`linkr_group_roles_${groupId}`);
    return raw ? (JSON.parse(raw) as Record<string, GroupRole>) : {};
  } catch {
    return {};
  }
}

export function setGroupRoles(
  groupId: string,
  roles: Record<string, GroupRole>,
): void {
  localStorage.setItem(`linkr_group_roles_${groupId}`, JSON.stringify(roles));
}

export function setGroupRole(
  groupId: string,
  uid: string,
  role: GroupRole,
): void {
  const roles = getGroupRoles(groupId);
  roles[uid] = role;
  setGroupRoles(groupId, roles);
}

export function initGroupRoles(
  groupId: string,
  adminId: string,
  memberIds: string[],
): void {
  const existing = getGroupRoles(groupId);
  if (Object.keys(existing).length > 0) return; // already initialized
  const roles: Record<string, GroupRole> = {};
  roles[adminId] = "admin";
  for (const uid of memberIds) {
    if (uid !== adminId) roles[uid] = "member";
  }
  setGroupRoles(groupId, roles);
}

// ─── Group Announcements ──────────────────────────────────────────────────────

export function getAnnouncements(groupId: string): string[] {
  try {
    const raw = localStorage.getItem(`linkr_announcements_${groupId}`);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addAnnouncement(groupId: string, text: string): string[] {
  const current = getAnnouncements(groupId);
  const updated = [text, ...current];
  localStorage.setItem(
    `linkr_announcements_${groupId}`,
    JSON.stringify(updated),
  );
  return updated;
}

// ─── Self-Destruct ────────────────────────────────────────────────────────────

const SELF_DESTRUCT_KEY = "linkr_selfdestruct";

export function getSelfDestructTimers(): Record<string, SelfDestructTimer> {
  try {
    const raw = localStorage.getItem(SELF_DESTRUCT_KEY);
    return raw ? (JSON.parse(raw) as Record<string, SelfDestructTimer>) : {};
  } catch {
    return {};
  }
}

export function setSelfDestructTimer(
  messageId: string,
  chatId: string,
  destroyAt: number,
): void {
  const timers = getSelfDestructTimers();
  timers[messageId] = { destroyAt, chatId };
  localStorage.setItem(SELF_DESTRUCT_KEY, JSON.stringify(timers));
}

export function removeSelfDestructTimer(messageId: string): void {
  const timers = getSelfDestructTimers();
  delete timers[messageId];
  localStorage.setItem(SELF_DESTRUCT_KEY, JSON.stringify(timers));
}

export function getExpiredTimers(): Array<{
  messageId: string;
  chatId: string;
}> {
  const timers = getSelfDestructTimers();
  const now = Date.now();
  return Object.entries(timers)
    .filter(([, t]) => t.destroyAt <= now)
    .map(([messageId, t]) => ({ messageId, chatId: t.chatId }));
}

// ─── Notes to Self ────────────────────────────────────────────────────────────

export interface Note {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export function getNotes(uid: string): Note[] {
  try {
    const raw = localStorage.getItem(`linkr_notes_${uid}`);
    return raw ? (JSON.parse(raw) as Note[]) : [];
  } catch {
    return [];
  }
}

export function saveNote(uid: string, note: Note): void {
  try {
    const notes = getNotes(uid);
    const idx = notes.findIndex((n) => n.id === note.id);
    if (idx >= 0) {
      notes[idx] = note;
    } else {
      notes.unshift(note);
    }
    localStorage.setItem(`linkr_notes_${uid}`, JSON.stringify(notes));
  } catch {
    // ignore
  }
}

export function deleteNote(uid: string, noteId: string): void {
  try {
    const notes = getNotes(uid).filter((n) => n.id !== noteId);
    localStorage.setItem(`linkr_notes_${uid}`, JSON.stringify(notes));
  } catch {
    // ignore
  }
}

// ─── Message Bookmarks ────────────────────────────────────────────────────────

export interface Bookmark {
  messageId: string;
  chatId: string;
  text: string;
  senderUsername: string;
  createdAt: number;
}

export function getBookmarks(uid: string): Bookmark[] {
  try {
    const raw = localStorage.getItem(`linkr_bookmarks_${uid}`);
    return raw ? (JSON.parse(raw) as Bookmark[]) : [];
  } catch {
    return [];
  }
}

export function addBookmark(uid: string, bookmark: Bookmark): void {
  try {
    const bookmarks = getBookmarks(uid);
    if (!bookmarks.find((b) => b.messageId === bookmark.messageId)) {
      bookmarks.unshift(bookmark);
      localStorage.setItem(`linkr_bookmarks_${uid}`, JSON.stringify(bookmarks));
    }
  } catch {
    // ignore
  }
}

export function removeBookmark(uid: string, messageId: string): void {
  try {
    const bookmarks = getBookmarks(uid).filter(
      (b) => b.messageId !== messageId,
    );
    localStorage.setItem(`linkr_bookmarks_${uid}`, JSON.stringify(bookmarks));
  } catch {
    // ignore
  }
}

export function isBookmarked(uid: string, messageId: string): boolean {
  return getBookmarks(uid).some((b) => b.messageId === messageId);
}

// ─── Message Reports ──────────────────────────────────────────────────────────

export interface Report {
  id: string;
  messageId: string;
  chatId: string;
  reason: string;
  reportedBy: string;
  createdAt: number;
}

export function addReport(uid: string, report: Report): void {
  try {
    const reports = getReports(uid);
    reports.unshift(report);
    localStorage.setItem(`linkr_reports_${uid}`, JSON.stringify(reports));
  } catch {
    // ignore
  }
}

export function getReports(uid: string): Report[] {
  try {
    const raw = localStorage.getItem(`linkr_reports_${uid}`);
    return raw ? (JSON.parse(raw) as Report[]) : [];
  } catch {
    return [];
  }
}

// ─── Chat Wallpapers ──────────────────────────────────────────────────────────

export const WALLPAPER_OPTIONS: { id: string; label: string; value: string }[] =
  [
    { id: "none", label: "Default", value: "" },
    {
      id: "pink-violet",
      label: "Pink Violet",
      value:
        "linear-gradient(135deg, oklch(0.95 0.03 345), oklch(0.96 0.02 290))",
    },
    {
      id: "midnight",
      label: "Midnight",
      value:
        "linear-gradient(135deg, oklch(0.12 0.03 268), oklch(0.16 0.04 280))",
    },
    {
      id: "ocean",
      label: "Ocean",
      value:
        "linear-gradient(135deg, oklch(0.94 0.04 220), oklch(0.96 0.03 250))",
    },
    {
      id: "forest",
      label: "Forest",
      value:
        "linear-gradient(135deg, oklch(0.94 0.04 145), oklch(0.96 0.03 160))",
    },
    {
      id: "sunset",
      label: "Sunset",
      value:
        "linear-gradient(135deg, oklch(0.95 0.06 30), oklch(0.97 0.04 60))",
    },
    {
      id: "lavender",
      label: "Lavender",
      value:
        "linear-gradient(135deg, oklch(0.94 0.04 290), oklch(0.96 0.03 310))",
    },
    {
      id: "rose",
      label: "Rose",
      value:
        "linear-gradient(135deg, oklch(0.96 0.04 10), oklch(0.97 0.03 350))",
    },
    {
      id: "slate",
      label: "Slate",
      value:
        "linear-gradient(135deg, oklch(0.92 0.01 270), oklch(0.94 0.01 260))",
    },
    {
      id: "warm",
      label: "Warm Sand",
      value:
        "linear-gradient(135deg, oklch(0.96 0.03 80), oklch(0.97 0.02 70))",
    },
    {
      id: "aurora",
      label: "Aurora",
      value:
        "linear-gradient(135deg, oklch(0.94 0.05 180), oklch(0.95 0.04 220))",
    },
    {
      id: "cherry",
      label: "Cherry",
      value:
        "linear-gradient(135deg, oklch(0.95 0.06 345), oklch(0.96 0.05 10))",
    },
  ];

export function getChatWallpaper(chatId: string): string {
  try {
    return localStorage.getItem(`linkr_wallpaper_${chatId}`) ?? "";
  } catch {
    return "";
  }
}

export function setChatWallpaper(chatId: string, value: string): void {
  try {
    if (value) {
      localStorage.setItem(`linkr_wallpaper_${chatId}`, value);
    } else {
      localStorage.removeItem(`linkr_wallpaper_${chatId}`);
    }
  } catch {
    // ignore
  }
}

// ─── Accent Color ─────────────────────────────────────────────────────────────

export const ACCENT_COLORS: { name: string; oklch: string; hue: number }[] = [
  { name: "Pink", oklch: "0.62 0.27 345", hue: 345 },
  { name: "Violet", oklch: "0.58 0.25 290", hue: 290 },
  { name: "Blue", oklch: "0.60 0.23 250", hue: 250 },
  { name: "Cyan", oklch: "0.65 0.18 200", hue: 200 },
  { name: "Teal", oklch: "0.60 0.18 180", hue: 180 },
  { name: "Green", oklch: "0.60 0.20 145", hue: 145 },
  { name: "Orange", oklch: "0.65 0.22 50", hue: 50 },
  { name: "Red", oklch: "0.58 0.24 27", hue: 27 },
  { name: "Rose", oklch: "0.62 0.24 10", hue: 10 },
  { name: "Indigo", oklch: "0.55 0.25 270", hue: 270 },
];

export function getAccentColor(): string {
  try {
    return localStorage.getItem("linkr_accent_color") ?? "0.62 0.27 345";
  } catch {
    return "0.62 0.27 345";
  }
}

export function setAccentColorPref(color: string): void {
  try {
    localStorage.setItem("linkr_accent_color", color);
  } catch {
    // ignore
  }
}

export function applyAccentColor(): void {
  try {
    const color = getAccentColor();
    document.documentElement.style.setProperty("--primary", color);
    document.documentElement.style.setProperty("--ring", color);
    document.documentElement.style.setProperty("--sidebar-primary", color);
    document.documentElement.style.setProperty("--sidebar-ring", color);
    document.documentElement.style.setProperty("--bubble-sender", color);
  } catch {
    // ignore
  }
}

// ─── Font Size ────────────────────────────────────────────────────────────────

export function getFontSize(): "small" | "medium" | "large" {
  try {
    const val = localStorage.getItem("linkr_font_size");
    if (val === "small" || val === "medium" || val === "large") return val;
    return "medium";
  } catch {
    return "medium";
  }
}

export function setFontSizePref(size: "small" | "medium" | "large"): void {
  try {
    localStorage.setItem("linkr_font_size", size);
  } catch {
    // ignore
  }
}

export function applyFontSize(): void {
  try {
    const size = getFontSize();
    document.documentElement.classList.remove(
      "font-small",
      "font-medium",
      "font-large",
    );
    document.documentElement.classList.add(`font-${size}`);
  } catch {
    // ignore
  }
}

// ─── Bubble Style ─────────────────────────────────────────────────────────────

export function getBubbleStyle(): "classic" | "sharp" | "round" {
  try {
    const val = localStorage.getItem("linkr_bubble_style");
    if (val === "classic" || val === "sharp" || val === "round") return val;
    return "classic";
  } catch {
    return "classic";
  }
}

export function setBubbleStylePref(style: "classic" | "sharp" | "round"): void {
  try {
    localStorage.setItem("linkr_bubble_style", style);
  } catch {
    // ignore
  }
}

export function applyBubbleStyle(): void {
  try {
    const style = getBubbleStyle();
    document.documentElement.classList.remove(
      "bubble-classic",
      "bubble-sharp",
      "bubble-round",
    );
    document.documentElement.classList.add(`bubble-${style}`);
  } catch {
    // ignore
  }
}

// ─── Screen Time ──────────────────────────────────────────────────────────────

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function trackSessionStart(): void {
  try {
    localStorage.setItem("linkr_session_start", Date.now().toString());
  } catch {
    // ignore
  }
}

export function trackSessionEnd(): void {
  try {
    const startStr = localStorage.getItem("linkr_session_start");
    if (!startStr) return;
    const start = Number.parseInt(startStr, 10);
    const elapsed = Math.floor((Date.now() - start) / 60000); // minutes
    const key = `linkr_screen_time_${todayKey()}`;
    const prev = Number.parseInt(localStorage.getItem(key) ?? "0", 10);
    localStorage.setItem(key, (prev + elapsed).toString());
    localStorage.removeItem("linkr_session_start");
  } catch {
    // ignore
  }
}

export function getTodayScreenTime(): number {
  try {
    const base = Number.parseInt(
      localStorage.getItem(`linkr_screen_time_${todayKey()}`) ?? "0",
      10,
    );
    // Add current in-progress session
    const startStr = localStorage.getItem("linkr_session_start");
    if (!startStr) return base;
    const start = Number.parseInt(startStr, 10);
    const inProgress = Math.floor((Date.now() - start) / 60000);
    return base + inProgress;
  } catch {
    return 0;
  }
}

export function getWeekScreenTime(): number {
  try {
    const today = new Date();
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = `linkr_screen_time_${d.toISOString().slice(0, 10)}`;
      total += Number.parseInt(localStorage.getItem(key) ?? "0", 10);
    }
    // Add current session
    const startStr = localStorage.getItem("linkr_session_start");
    if (startStr) {
      const start = Number.parseInt(startStr, 10);
      total += Math.floor((Date.now() - start) / 60000);
    }
    return total;
  } catch {
    return 0;
  }
}

export function formatScreenTime(minutes: number): string {
  if (minutes < 1) return "< 1m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── Stories ──────────────────────────────────────────────────────────────────

export interface Story {
  id: string;
  authorId: string;
  authorUsername: string;
  authorAvatar: string;
  text: string;
  bgColor: string;
  createdAt: number;
  expiresAt: number;
}

const STORIES_KEY = "linkr_stories";

export function getActiveStories(): Story[] {
  try {
    const raw = localStorage.getItem(STORIES_KEY);
    const all = raw ? (JSON.parse(raw) as Story[]) : [];
    const now = Date.now();
    const active = all.filter((s) => s.expiresAt > now);
    // Persist pruned list
    if (active.length !== all.length) {
      localStorage.setItem(STORIES_KEY, JSON.stringify(active));
    }
    return active;
  } catch {
    return [];
  }
}

export function createStory(story: Omit<Story, "id" | "expiresAt">): Story {
  const newStory: Story = {
    ...story,
    id: `story_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    expiresAt: story.createdAt + 24 * 60 * 60 * 1000,
  };
  const all = getActiveStories();
  all.unshift(newStory);
  localStorage.setItem(STORIES_KEY, JSON.stringify(all));
  return newStory;
}

export function deleteStory(id: string): void {
  try {
    const all = getActiveStories().filter((s) => s.id !== id);
    localStorage.setItem(STORIES_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export function hasViewedStory(storyId: string, uid: string): boolean {
  try {
    const key = `linkr_story_views_${storyId}`;
    const views: string[] = JSON.parse(localStorage.getItem(key) ?? "[]");
    return views.includes(uid);
  } catch {
    return false;
  }
}

export function markStoryViewed(storyId: string, uid: string): void {
  try {
    const key = `linkr_story_views_${storyId}`;
    const views: string[] = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (!views.includes(uid)) {
      views.push(uid);
      localStorage.setItem(key, JSON.stringify(views));
    }
  } catch {
    // ignore
  }
}

// ─── Scheduled Messages ───────────────────────────────────────────────────────

export interface ScheduledMessage {
  id: string;
  chatId: string;
  text: string;
  scheduledAt: number;
  groupId?: string;
}

export function getScheduledMessages(uid: string): ScheduledMessage[] {
  try {
    const raw = localStorage.getItem(`linkr_scheduled_${uid}`);
    return raw ? (JSON.parse(raw) as ScheduledMessage[]) : [];
  } catch {
    return [];
  }
}

export function addScheduledMessage(uid: string, msg: ScheduledMessage): void {
  try {
    const msgs = getScheduledMessages(uid);
    msgs.push(msg);
    localStorage.setItem(`linkr_scheduled_${uid}`, JSON.stringify(msgs));
  } catch {
    // ignore
  }
}

export function removeScheduledMessage(uid: string, id: string): void {
  try {
    const msgs = getScheduledMessages(uid).filter((m) => m.id !== id);
    localStorage.setItem(`linkr_scheduled_${uid}`, JSON.stringify(msgs));
  } catch {
    // ignore
  }
}

export function getDueMessages(uid: string): ScheduledMessage[] {
  const now = Date.now();
  return getScheduledMessages(uid).filter((m) => m.scheduledAt <= now);
}

// ─── Birthday Notifications ───────────────────────────────────────────────────

export function checkBirthdayNotifications(
  _currentUserUid: string,
  followedUsers: Array<{ uid: string; username: string; birthDate?: string }>,
): Array<string> {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayMD = `${mm}-${dd}`;
  const dateKey = today.toISOString().slice(0, 10);

  const birthdayUsers: string[] = [];

  for (const user of followedUsers) {
    if (!user.birthDate) continue;
    // Support YYYY-MM-DD, MM-DD, or DD/MM formats
    let md = "";
    const iso = user.birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const mmd = user.birthDate.match(/^(\d{2})-(\d{2})$/);
    const ddmm = user.birthDate.match(/^(\d{2})\/(\d{2})$/);
    if (iso) md = `${iso[2]}-${iso[3]}`;
    else if (mmd) md = `${mmd[1]}-${mmd[2]}`;
    else if (ddmm) md = `${ddmm[2]}-${ddmm[1]}`;

    if (md !== todayMD) continue;

    const shownKey = `linkr_birthday_shown_${dateKey}_${user.uid}`;
    if (localStorage.getItem(shownKey)) continue;
    localStorage.setItem(shownKey, "1");
    birthdayUsers.push(user.username);
  }

  return birthdayUsers;
}

// ─── Verification Badges ──────────────────────────────────────────────────────

const VERIFIED_KEY = "linkr_verified_users";

export function getVerifiedUsers(): Set<string> {
  try {
    const raw = localStorage.getItem(VERIFIED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function setVerifiedUser(uid: string, verified: boolean): void {
  try {
    const set = getVerifiedUsers();
    if (verified) set.add(uid);
    else set.delete(uid);
    localStorage.setItem(VERIFIED_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

export function isUserVerified(uid: string): boolean {
  return getVerifiedUsers().has(uid);
}

// ─── Group Invite Links ───────────────────────────────────────────────────────

export function getGroupInviteLink(groupId: string): string {
  return `${window.location.origin}/join/${groupId}`;
}

// ─── Profile View History ──────────────────────────────────────────────────────

export interface ProfileView {
  viewerUid: string;
  viewerUsername: string;
  viewedAt: number;
}

export function recordProfileView(
  viewerUid: string,
  viewerUsername: string,
  profileUid: string,
): void {
  if (viewerUid === profileUid) return; // don't record self-views
  try {
    const key = `linkr_profile_views_${profileUid}`;
    const existing: ProfileView[] = JSON.parse(
      localStorage.getItem(key) ?? "[]",
    );
    // Remove old entry for this viewer
    const filtered = existing.filter((v) => v.viewerUid !== viewerUid);
    const updated = [
      { viewerUid, viewerUsername, viewedAt: Date.now() },
      ...filtered,
    ].slice(0, 20);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function getProfileViews(profileUid: string): ProfileView[] {
  try {
    const key = `linkr_profile_views_${profileUid}`;
    return JSON.parse(localStorage.getItem(key) ?? "[]") as ProfileView[];
  } catch {
    return [];
  }
}

// ─── Collaborative To-Do Lists ────────────────────────────────────────────────

export interface TodoItem {
  id: string;
  chatId: string;
  text: string;
  done: boolean;
  createdBy: string;
  createdAt: number;
}

function getTodoKey(chatId: string): string {
  return `linkr_todos_${chatId}`;
}

export function getTodos(chatId: string): TodoItem[] {
  try {
    return JSON.parse(
      localStorage.getItem(getTodoKey(chatId)) ?? "[]",
    ) as TodoItem[];
  } catch {
    return [];
  }
}

export function addTodo(chatId: string, text: string, uid: string): TodoItem[] {
  const todos = getTodos(chatId);
  const newTodo: TodoItem = {
    id: `todo_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    chatId,
    text,
    done: false,
    createdBy: uid,
    createdAt: Date.now(),
  };
  const updated = [...todos, newTodo];
  localStorage.setItem(getTodoKey(chatId), JSON.stringify(updated));
  return updated;
}

export function toggleTodo(chatId: string, todoId: string): TodoItem[] {
  const todos = getTodos(chatId).map((t) =>
    t.id === todoId ? { ...t, done: !t.done } : t,
  );
  localStorage.setItem(getTodoKey(chatId), JSON.stringify(todos));
  return todos;
}

export function deleteTodo(chatId: string, todoId: string): TodoItem[] {
  const todos = getTodos(chatId).filter((t) => t.id !== todoId);
  localStorage.setItem(getTodoKey(chatId), JSON.stringify(todos));
  return todos;
}

// ─── Custom Emoji Reactions ────────────────────────────────────────────────────

export function getCustomReactions(uid: string): string[] {
  try {
    return JSON.parse(
      localStorage.getItem(`linkr_custom_reactions_${uid}`) ?? "[]",
    ) as string[];
  } catch {
    return [];
  }
}

export function saveCustomReactions(uid: string, emojis: string[]): void {
  try {
    localStorage.setItem(
      `linkr_custom_reactions_${uid}`,
      JSON.stringify(emojis.slice(0, 5)),
    );
  } catch {
    // ignore
  }
}

// ─── Activity Streak ──────────────────────────────────────────────────────────

export function recordDailyActivity(uid: string): void {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const key = `linkr_activity_${uid}`;
    const existing: string[] = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (!existing.includes(today)) {
      existing.push(today);
      localStorage.setItem(key, JSON.stringify(existing));
    }
  } catch {
    // ignore
  }
}

export function getActivityStreak(uid: string): number {
  try {
    const key = `linkr_activity_${uid}`;
    const dates: string[] = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (dates.length === 0) return 0;

    const today = new Date();
    let streak = 0;
    const datesSet = new Set(dates);

    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (datesSet.has(key)) {
        streak++;
      } else if (i > 0) {
        break; // streak broken
      }
    }
    return streak;
  } catch {
    return 0;
  }
}

// ─── Public Rooms / Channels ──────────────────────────────────────────────────

export interface PublicRoom {
  id: string;
  name: string;
  description: string;
  topic: string;
  creatorId: string;
  creatorUsername: string;
  members: string[];
  createdAt: number;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  authorId: string;
  authorUsername: string;
  text: string;
  createdAt: number;
}

const ROOMS_KEY = "linkr_public_rooms";

export function getRooms(): PublicRoom[] {
  try {
    return JSON.parse(localStorage.getItem(ROOMS_KEY) ?? "[]") as PublicRoom[];
  } catch {
    return [];
  }
}

export function saveRooms(rooms: PublicRoom[]): void {
  try {
    localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
  } catch {
    // ignore
  }
}

export function createRoom(
  name: string,
  description: string,
  topic: string,
  creatorId: string,
  creatorUsername: string,
): PublicRoom {
  const room: PublicRoom = {
    id: `room_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    description,
    topic,
    creatorId,
    creatorUsername,
    members: [creatorId],
    createdAt: Date.now(),
  };
  const rooms = getRooms();
  rooms.unshift(room);
  saveRooms(rooms);
  return room;
}

export function joinRoom(roomId: string, uid: string): void {
  const rooms = getRooms().map((r) =>
    r.id === roomId && !r.members.includes(uid)
      ? { ...r, members: [...r.members, uid] }
      : r,
  );
  saveRooms(rooms);
}

export function leaveRoom(roomId: string, uid: string): void {
  const rooms = getRooms().map((r) =>
    r.id === roomId ? { ...r, members: r.members.filter((m) => m !== uid) } : r,
  );
  saveRooms(rooms);
}

export function getRoomMessages(roomId: string): RoomMessage[] {
  try {
    return JSON.parse(
      localStorage.getItem(`linkr_room_msgs_${roomId}`) ?? "[]",
    ) as RoomMessage[];
  } catch {
    return [];
  }
}

export function addRoomMessage(
  roomId: string,
  authorId: string,
  authorUsername: string,
  text: string,
): RoomMessage {
  const msg: RoomMessage = {
    id: `rmsg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    roomId,
    authorId,
    authorUsername,
    text,
    createdAt: Date.now(),
  };
  const msgs = getRoomMessages(roomId);
  msgs.push(msg);
  localStorage.setItem(`linkr_room_msgs_${roomId}`, JSON.stringify(msgs));
  return msg;
}
