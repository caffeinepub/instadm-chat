# Linkr

## Current State
Full-stack real-time chat app on ICP with:
- Internet Identity login + username registration
- 1:1 DM chats with real-time polling (200ms incremental, 800ms full refresh)
- Group chats with admin/mod/member roles
- Message features: text, image, voice, reactions, reply, edit, delete for everyone, pin, vanish mode
- Follow/unfollow system with private account follow-request gating
- Notifications (browser push + in-app toast)
- Feed page (basic posts), Explore page (users + leaderboard), Public Rooms/Channels (basic)
- Stories (basic), Status/Mood, Polls in chat, Shared Media Gallery
- Message formatting, self-destructing messages, message threads
- Group announcements, badges/achievements
- Notes to Self, Saved Messages, Bookmarks, Chat Wallpapers, Chat Themes
- Chat Folders, Last Seen Privacy, Undo Send, Double-tap heart, Message Scheduling
- Screen Time Tracker, Message Report
- Profile: bio, avatar, portfolio/links, birthday, view history, username history
- Settings: privacy, notifications, appearance, account

## Requested Changes (Diff)

### Add

**Telegram Channel Features:**
- Public Channels: create, join/leave, subscriber count, admin-only post, pinned message, channel description, channel rules, invite link
- Channel discovery on Explore page
- Forward message with source attribution (already partial)
- Anonymous poll voting (improve existing)
- Slow mode per group (configurable: off/30s/1m/5m/15m/1h)
- Group invite links (generate, share, join via link)
- Group rules/description editable by admin

**WhatsApp Status (Feed replacement):**
- Status posts: text with colorful background OR photo
- Status visible to followers for 24 hours, then auto-delete
- Views count per status (who viewed)
- Reply to status via DM (opens chat)
- Status privacy: Everyone / My Followers / Close Friends
- Close Friends list management in Settings

**Instagram Stories (upgrade existing):**
- 24-hour auto-expiring stories stored in bio-encoded or separate backend field
- Story reactions (emoji tap reply)
- Story views list
- Story highlights (permanent, saved to profile)
- Story reply goes to DM
- Close Friends story (visible only to close friends list)
- Stories bar at top of home feed

**Search improvements:**
- Partial/substring username search (not just prefix)
- All registered users browsable on Explore "People" tab

**Additional social features:**
- User Notes (short 60-char status visible on profile like Instagram Notes)
- Birthday notifications to followers
- Verified badge support in profile

### Modify
- Feed page: replace generic feed with WhatsApp Status-style colored text/photo statuses
- Stories: upgrade to 24h auto-delete with highlights, views, reactions
- Public Channels page: upgrade with full Telegram-style features
- Group settings: add slow mode toggle, invite link generation
- Explore: add Channels tab and People (all users) tab
- Profile page: add Story Highlights section, Close Friends badge

### Remove
- Nothing removed; all existing features preserved

## Implementation Plan

### Backend (Motoko):
1. Add `Channel` type: id, name, description, rules, adminId, subscribers, createdAt, inviteLink, slowMode, pinnedMessage
2. Add `Story` type: id, authorId, content (text or mediaUrl), bgColor, createdAt, expiresAt, views, reactions, isCloseFriends, isHighlight
3. Add `Status` type (WhatsApp-style): id, authorId, text, bgColor, photoUrl, createdAt, expiresAt (24h), views, privacy
4. Add channel functions: createChannel, joinChannel, leaveChannel, postToChannel, getChannels, getChannelById, setChannelSlowMode, generateChannelInviteLink, joinChannelByInviteLink, pinMessageInChannel
5. Add story functions: createStory, getStoriesForUser, getMyStories, markStoryViewed, reactToStory, deleteStory, addStoryHighlight, getHighlights
6. Add status functions: createStatus, getStatusFeed, markStatusViewed, deleteStatus
7. Add closeFriends to UserProfile: closeFriends array of UIDs
8. Add group inviteLink field and generateGroupInviteLink, joinGroupByInviteLink functions
9. Add groupSlowMode field to GroupChat
10. Improve searchProfiles to do full substring search

### Frontend:
1. Feed page → WhatsApp Status page (colored text/photo statuses, 24h expiry, views, reply via DM)
2. Stories bar on Home → real stories with 24h expiry, view counts, reactions, highlights
3. Channels page → full Telegram-style (join, post, subscriber count, invite link, pinned)
4. Group settings modal → slow mode, invite link, rules
5. Profile page → Story Highlights row, Close Friends management
6. Explore page → add Channels tab + People tab (all users)
7. Settings → Close Friends list management
