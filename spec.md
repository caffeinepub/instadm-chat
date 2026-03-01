# Linkr — Batch 1 Feature Addition

## Current State
Linkr is a real-time chat app on ICP with:
- Internet Identity login + username registration
- DM chats (real-time polling at 500ms)
- Group chats (create, add members, leave)
- Message actions: reactions, reply, edit, delete for everyone
- Follow/unfollow, follow requests for private accounts
- Media: photo uploads, voice recording
- Seen indicator, typing indicator
- Notifications (browser + in-app)
- Dark mode, pink/violet theme
- Pin/archive/mute/vanish mode chats
- Profile page, settings page, notifications page, archive page

## Requested Changes (Diff)

### Add
1. **Status / Mood** — Users can set a mood string (e.g. "Busy", "Gaming", "At work") stored in UserProfile. Shown in sidebar next to avatar and on profile page.
2. **Polls in Chat** — Send a poll inside DM or group chat. Poll has a question + up to 4 options. Each user can vote once. Vote counts shown in real-time.
3. **Shared Media Gallery** — Per-conversation tab showing all images/videos/voice messages sent in that chat, in a grid layout.
4. **Explore Page** — Discover public users and public rooms. Shows recommended users (non-followed), trending hashtags from posts.
5. **Public Feed / Timeline** — Users can post updates (text + optional image). Posts visible to followers. Like and comment on posts.
6. **Message Formatting** — Support bold (`**text**`), italic (`_text_`), strikethrough (`~~text~~`), and code (`` `code` ``) in message text. Rendered on display.
7. **Self-Destructing Messages** — When sending, user can set a timer (5s, 30s, 1min, 5min, 1hr). Message auto-deletes after being seen for that duration.
8. **Message Threads** — In group chats, users can reply to a message to start a thread. Thread view shows original message + replies in a side panel.
9. **Group Roles** — Groups have roles: Admin, Moderator, Member. Admin can assign Moderator. Moderators can remove members. Shown with badge next to name.
10. **Group Announcements** — Admin/Moderator can post announcements in a group. Shown as a pinned banner in the chat.
11. **Badges & Achievements** — Milestone badges: "First Message", "100 Messages", "10 Followers", "Group Creator", etc. Displayed on profile page.

### Modify
- `UserProfile` — add `mood` (Text), `badges` ([Text]) fields
- `GroupChat` — add `roles` ([(Text, Text)]) for member roles, `announcements` ([Text]) for group announcements
- `Message` — add `selfDestructAfter` (?Int) for self-destruct timer in seconds, `threadId` (?MessageId) for thread parent
- `sendMessage` / `sendGroupMessage` — accept `selfDestructAfter` and `threadId` params
- Public feed stored in new `posts` map with like/comment support

### Remove
- Nothing removed

## Implementation Plan

### Backend (Motoko)
1. Add `mood` and `badges` fields to `UserProfile`
2. Add `selfDestructAfter` and `threadId` to `Message`
3. Add `roles` and `announcements` to `GroupChat`
4. Add new `Post` type with `likes`, `comments`, `hashtags` fields
5. Add `Poll` type stored as a special message or separate map
6. New functions:
   - `setMood(mood: Text)` — update caller's mood
   - `createPost(text, mediaUrl, hashtags)` — create feed post
   - `getFeedPosts(afterTimestamp)` — get posts from followed users
   - `getExplorePosts()` — get recent public posts
   - `likePost(postId)` / `unlikePost(postId)`
   - `commentOnPost(postId, comment)`
   - `createPoll(chatId, question, options)` — create poll in DM
   - `createGroupPoll(groupId, question, options)` — create poll in group
   - `votePoll(pollId, optionIndex)` — cast vote
   - `getPoll(pollId)` — get poll with vote counts
   - `setGroupMemberRole(groupId, userId, role)` — set role
   - `addGroupAnnouncement(groupId, text)` — post announcement
   - `getGroupMessages` — include thread messages
   - `awardBadge(userId, badge)` — internal function, called on milestone events
   - Update `sendMessage` / `sendGroupMessage` to accept `selfDestructAfter`, `threadId`

### Frontend
1. **Status/Mood**: Add mood selector dropdown in profile edit. Show mood in sidebar contact list and chat header.
2. **Polls**: Add poll button in chat input. Poll creation modal (question + 4 options). Poll bubble in chat with vote buttons and live counts.
3. **Shared Media Gallery**: Add "Media" tab in chat header. Grid of thumbnails, click to open full screen.
4. **Explore Page**: New page accessible from nav. Shows trending users, hashtag cloud, recent public posts.
5. **Public Feed**: New "Feed" section or page. Shows posts from followed users. Like button, comment thread, share.
6. **Message Formatting**: Parse markdown-lite in message text on render (bold, italic, strikethrough, code).
7. **Self-Destructing Messages**: Timer picker in send area (clock icon). Countdown shown on message bubble after seen.
8. **Message Threads**: In group chat, click "Reply in thread" on any message. Side panel opens showing thread.
9. **Group Roles**: Role badge (Admin=gold, Mod=silver, Member=grey) next to name in group member list. Admin can change roles.
10. **Group Announcements**: Announcement editor for admin/mod. Shown as a pinned yellow banner at top of group chat.
11. **Badges**: Badge icons shown on profile. Auto-awarded on first message, 100 messages, 10 followers, group creation.
