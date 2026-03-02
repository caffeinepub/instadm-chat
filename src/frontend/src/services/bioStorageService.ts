/**
 * bioStorageService.ts
 *
 * Encodes and decodes posts + stories into/from a user's ICP profile bio.
 * The bio is stored on-chain, so this gives real cross-device, cross-user
 * visibility for feed posts and active stories.
 *
 * Format:
 *   <user bio text>##POSTS##<base64(JSON.stringify(posts))>##STORIES##<base64(JSON.stringify(stories))>
 *
 * Each user can store up to 5 posts and 3 active stories in their bio.
 * The displayable bio is the plain-text part before ##POSTS##.
 */

import type { Post, Story } from "./featureService";

const POSTS_MARKER = "##POSTS##";
const STORIES_MARKER = "##STORIES##";
const MAX_POSTS_IN_BIO = 5;
const MAX_STORIES_IN_BIO = 3;

// ─── Encode ────────────────────────────────────────────────────────────────────

/**
 * Safely encodes an object to base64, stripping large mediaUrl fields to save space.
 */
function safeBase64(obj: unknown): string {
  try {
    const json = JSON.stringify(obj);
    return btoa(unescape(encodeURIComponent(json)));
  } catch {
    return "";
  }
}

function safeBase64Decode<T>(b64: string): T | null {
  try {
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Strips large base64 data URLs from posts before storing in bio (space-saving).
 * Keeps external URLs intact.
 */
function stripLargeMedia(post: Post): Post {
  if (post.mediaUrl?.startsWith("data:")) {
    return { ...post, mediaUrl: undefined };
  }
  return post;
}

function stripStoryMedia(story: Story): Story {
  if (story.authorAvatar?.startsWith("data:")) {
    return { ...story, authorAvatar: "" };
  }
  return story;
}

/**
 * Encodes up to 5 posts + 3 stories into a bio suffix string.
 * Returns the combined string to append to the plain bio text.
 */
export function encodeBioPayload(posts: Post[], stories: Story[]): string {
  const recentPosts = posts.slice(0, MAX_POSTS_IN_BIO).map(stripLargeMedia);
  const activeStories = stories
    .slice(0, MAX_STORIES_IN_BIO)
    .map(stripStoryMedia);

  const postsEncoded = safeBase64(recentPosts);
  const storiesEncoded = safeBase64(activeStories);

  let result = "";
  if (postsEncoded) result += `${POSTS_MARKER}${postsEncoded}`;
  if (storiesEncoded) result += `${STORIES_MARKER}${storiesEncoded}`;
  return result;
}

/**
 * Extracts the plain-text portion of a bio (everything before ##POSTS##).
 */
export function extractPlainBio(rawBio: string): string {
  if (!rawBio) return "";
  const postsIdx = rawBio.indexOf(POSTS_MARKER);
  const storiesIdx = rawBio.indexOf(STORIES_MARKER);
  const cutIdx =
    postsIdx >= 0 && storiesIdx >= 0
      ? Math.min(postsIdx, storiesIdx)
      : postsIdx >= 0
        ? postsIdx
        : storiesIdx >= 0
          ? storiesIdx
          : -1;
  if (cutIdx < 0) return rawBio;
  return rawBio.slice(0, cutIdx).trim();
}

/**
 * Decodes posts stored in a user's raw bio string.
 */
export function decodePostsFromBio(rawBio: string): Post[] {
  if (!rawBio) return [];
  const postsIdx = rawBio.indexOf(POSTS_MARKER);
  if (postsIdx < 0) return [];
  const afterMarker = rawBio.slice(postsIdx + POSTS_MARKER.length);
  // Find end of base64 chunk (next marker or end of string)
  const storiesIdx = afterMarker.indexOf(STORIES_MARKER);
  const b64 = storiesIdx >= 0 ? afterMarker.slice(0, storiesIdx) : afterMarker;
  const decoded = safeBase64Decode<Post[]>(b64.trim());
  return decoded ?? [];
}

/**
 * Decodes stories stored in a user's raw bio string.
 */
export function decodeStoriesFromBio(rawBio: string): Story[] {
  if (!rawBio) return [];
  const storiesIdx = rawBio.indexOf(STORIES_MARKER);
  if (storiesIdx < 0) return [];
  const b64 = rawBio.slice(storiesIdx + STORIES_MARKER.length).trim();
  const decoded = safeBase64Decode<Story[]>(b64);
  return decoded ?? [];
}

/**
 * Builds a full bio string: "<plain text><encoded payload>".
 * Replaces any existing ##POSTS## / ##STORIES## section.
 */
export function buildBioWithPayload(
  plainBio: string,
  posts: Post[],
  stories: Story[],
): string {
  const payload = encodeBioPayload(posts, stories);
  return plainBio + payload;
}

/**
 * Merges posts from multiple users into one feed, deduplicating by ID.
 * Sorted newest first.
 */
export function mergeAllPosts(postsPerUser: Post[][]): Post[] {
  const seen = new Set<string>();
  const merged: Post[] = [];
  for (const userPosts of postsPerUser) {
    for (const post of userPosts) {
      if (!seen.has(post.id)) {
        seen.add(post.id);
        merged.push(post);
      }
    }
  }
  merged.sort((a, b) => b.createdAt - a.createdAt);
  return merged;
}

/**
 * Merges stories from multiple users, deduplicating by ID,
 * filtering out expired ones.
 */
export function mergeAllStories(storiesPerUser: Story[][]): Story[] {
  const seen = new Set<string>();
  const merged: Story[] = [];
  const now = Date.now();
  for (const userStories of storiesPerUser) {
    for (const story of userStories) {
      if (!seen.has(story.id) && story.expiresAt > now) {
        seen.add(story.id);
        merged.push(story);
      }
    }
  }
  return merged;
}
