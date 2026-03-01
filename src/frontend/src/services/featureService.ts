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
