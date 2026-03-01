# Linkr

## Current State

Full-stack ICP chat app with:
- Internet Identity authentication + username setup
- Real-time polling (1.5s messages, 1s typing, 3s chats)
- ICP backend stores all messages, chats, users
- Message reactions (add/remove via backend), reply, edit, delete-for-everyone, delete-for-me, forward
- Typing indicator (stored in backend chat document)
- Seen indicator: per-message seenBy array, backend `markMessagesSeen`
- Follow/unfollow user on backend
- Block/unblock user
- Pin/archive/mute/vanish mode per chat
- Profile page with private account toggle, bio, avatar
- Search users by username prefix via ICP backend
- Sidebar with chat list, pinned chats, unread badges
- Pink/violet-ish dark color palette already exists

## Requested Changes (Diff)

### Add
- **Follow request system**: When user A tries to follow private user B, create a pending follow request instead of immediately following. B can accept or decline. Only accepted followers can start DMs with a private account.
- **Follow requests page/section**: UI for pending follow requests (accept/decline)
- **Remove follow**: Already exists `unfollowUser` — expose button in profile ("Unfollow")
- **Cancel follow request**: Before request is accepted, sender can cancel it
- **Private DM gating**: If target user is private AND current user is not a follower, block opening chat — show "Follow request required" instead. Once request is accepted (they become a follower), DMs open normally.
- **Media upload**: Wire blob-storage component so photos can actually be uploaded and stored on ICP, not just a local object URL. Voice messages recorded via MediaRecorder and uploaded similarly.
- **Seen indicator fixes**: Ensure `markMessagesSeen` fires correctly and the UI reads `seenBy` properly for the last sent message.
- **Delete for everyone**: Ensure the sender-only restriction is correct and the UI reflects deleted messages immediately for all participants via polling.
- **Edit message**: Ensure edit works for sender and reflects for both sides on next poll.
- **Reactions**: Ensure emoji reactions show correctly with optimistic update and backend confirmation.
- **Pink + violet Instagram-style color theme**: Shift primary accent to vibrant pink (hue ~340) with secondary violet (hue ~280). Sender bubbles pink-gradient. Login page pink/violet orbs.
- **Smoother real-time**: Reduce message poll to 1s (from 1.5s) and chat poll to 2s (from 3s) for snappier feel.

### Modify
- **Backend**: Add `FollowRequest` type and storage, `sendFollowRequest`, `acceptFollowRequest`, `declineFollowRequest`, `cancelFollowRequest`, `getPendingFollowRequests` functions. Modify `followUser` to check if target is private — if so, create a follow request instead of immediately following.
- **ProfilePage**: Show Follow/Unfollow/Request Pending/Cancel Request button depending on relationship state. Show follower/following counts. Message button only if allowed (not private, or already a follower).
- **ChatContext.openChat**: Check if other user is private and current user is NOT in their followers — if so, show "send follow request" flow instead of opening chat.
- **Color palette**: Update index.css OKLCH tokens to pink/violet theme.
- **Polling intervals**: 1s messages, 2s chat list.

### Remove
- Nothing removed, only additions and fixes.

## Implementation Plan

1. Update `main.mo` backend:
   - Add `FollowRequest` type with `senderId`, `receiverId`, `status` (pending/accepted/declined), `createdAt`
   - Add `followRequests` map storage
   - Add `sendFollowRequest(targetId)` — if target is private, create a follow request; otherwise follow directly
   - Add `acceptFollowRequest(requestId)` — add follower, update status
   - Add `declineFollowRequest(requestId)` — update status
   - Add `cancelFollowRequest(targetId)` — remove pending request
   - Add `getPendingFollowRequests()` — returns requests where receiverId = caller
   - Add `getSentFollowRequests()` — returns requests where senderId = caller
   - Modify `followUser` to respect private accounts (or replace with `sendFollowRequest`)

2. Update `backend.d.ts` to reflect new functions

3. Frontend — ChatContext:
   - Reduce poll intervals (messages: 1s, chats: 2s)
   - In `openChat`, after checking private status, call `getSentFollowRequests` to determine if a request is already pending

4. Frontend — ProfilePage:
   - Add follow/unfollow/request/cancel logic
   - Add "Follow Requests" section visible to profile owner
   - Show correct CTA button based on relationship

5. Frontend — Follow Requests UI:
   - Small badge/section for pending follow requests

6. Frontend — ChatWindow:
   - Fix media upload to use blob-storage upload URL instead of local object URLs
   - Wire voice recording with MediaRecorder, upload on stop
   - Ensure seen indicator reads correctly from seenBy

7. Frontend — CSS (index.css):
   - Shift to pink/violet palette (primary hue ~340 pink, secondary hue ~290 violet)
   - Update bubble-sender to pink gradient
   - Update login orbs to pink/violet

8. Wire blob-storage for real media upload in sendMessage flow
