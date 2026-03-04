# Linkr

## Current State

Full-featured real-time chat app on ICP. Includes DMs, group chats, channels, stories, feed, reactions, media, polls, and many other features. Core issues:

1. **Message send indicators broken**: Messages show "pending" (loading) indefinitely in the chat box — no clear indication if msg was sent, delivering, or failed.
2. **Online status always shows "online"**: `onlineStatus` is never set to false. When a user is not active, it still shows "Active now".
3. **Last seen incorrect**: `lastSeen` is never updated reliably. The header shows wrong info.
4. **User profile not viewable from chat header**: Clicking on user name/avatar in chat header does nothing — user wants to see a mini-profile (only username and full name).
5. **No network error indicator**: No way to tell if a message failed to send due to network issues.

## Requested Changes (Diff)

### Add
- Message status states: `pending` (clock icon, dimmed), `sent` (single tick), `delivered` (double grey tick), `seen` (double blue tick)
- Network error indicator on message: red warning icon + "Failed to send. Tap to retry" when send fails
- Mini profile card (popover/sheet) when clicking user avatar/name in chat header — shows only avatar, username, full name
- Periodic heartbeat: every 60s when app is in foreground, update `lastSeen` on backend + keep `onlineStatus: true`
- On app close/blur/logout: set `onlineStatus: false` and update `lastSeen` on backend

### Modify
- `MessageBubble`: add `isPending` and `isFailed` props; show clock icon for pending, red retry icon for failed
- `ChatWindow` header: clicking avatar/username opens mini profile popover with username + fullName only
- `ChatWindow` header: online/offline logic — show "Active now" only if `onlineStatus === true` AND `lastSeen` was within last 2 minutes; otherwise show "Active X ago"
- `AuthContext`: on login set `onlineStatus: true`; on logout set `onlineStatus: false` + update `lastSeen`; add visibility/blur listener to update online status
- `ChatContext sendMessage`: track pending messages separately; on error mark as failed; expose retry

### Remove
- Nothing removed

## Implementation Plan

1. **Backend**: Add `updateLastSeen` function that sets `lastSeen = Time.now()` and `onlineStatus = true`. Already exists as part of `updateOnlineStatus`. Also ensure `getUserProfile` returns real `lastSeen` and `onlineStatus`.

2. **AuthContext heartbeat**: 
   - On mount: set `onlineStatus: true` via `actor.updateOnlineStatus(true)`
   - `setInterval` every 60s: call `actor.updateOnlineStatus(true)` 
   - On `document.visibilitychange` hidden: call `actor.updateOnlineStatus(false)`
   - On `window.beforeunload`: call `actor.updateOnlineStatus(false)`
   - On logout: call `actor.updateOnlineStatus(false)`

3. **Message pending/failed state**:
   - Add `status: 'pending' | 'sent' | 'failed'` to `Message` type (frontend only)
   - Optimistic messages start with `status: 'pending'`
   - On backend success: replace with real msg (`status: 'sent'`)
   - On backend error: mark optimistic as `status: 'failed'`
   - `sendMessage` exposes retry: re-send failed message

4. **MessageBubble** indicators:
   - `pending`: animated clock/spinner icon (grey)
   - `failed`: red `!` icon with "Tap to retry" label
   - `sent`: single grey check
   - `delivered`: double grey check (seenBy.length > 1 but not seen by other)
   - `seen`: double blue check + "Seen" label on last message

5. **Online/offline display fix in ChatWindow header**:
   - "Active now" only if `onlineStatus && (Date.now() - lastSeen) < 120_000`
   - Otherwise: "Active X ago" using `lastSeen` timestamp
   - Poll `getUserProfile` for the other user every 30s to get real-time online status

6. **Mini profile popover**:
   - Clicking avatar/username in chat header opens a `Popover` or `Sheet`
   - Shows: avatar, `@username`, full name (if set), online status indicator
   - No follow button, no bio, no stats — just name/username as requested
