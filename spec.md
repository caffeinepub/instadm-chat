# Linkr — Comprehensive Bug Fix & Polish

## Current State
A real-time ICP-based chat app with DMs, group chats, reactions, voice/media, follow system, and notifications. Multiple features are broken or not working reliably.

## Requested Changes (Diff)

### Add
- Message ID tracking map (timestamp → messageId) so edit/delete always find the correct backend ID
- Base64 encoding for voice messages and images to persist across browser sessions
- `searchUsersByUsername` call with proper multi-case search (lowercase, uppercase, original, prefix)
- Proper `otherUid` storage in a separate ref map when `openChat` is called so ChatWindow always resolves

### Modify
- **User search** — Sidebar's `searchUsers` function must call backend `searchUsersByUsername` + `searchUsersByUsernamePrefix` in parallel, deduplicate, filter self, return sorted results. Current implementation only calls local localStorage fallback.
- **ChatWindow `otherUid` derivation** — Currently tries to derive from `chats` state array which may not have the chat yet. Fix: store `chatId → otherUid` in a dedicated ref/context when `openChat` is called.
- **Message ID alignment** — Backend generates `chatId_nanosecondTimestamp`. Frontend stores this in `backendMsgToFrontend`. But when calling `editMessage`/`deleteMessageForEveryone`, frontend passes `msg.id` which is correct, BUT the context's `messages` state may have stale optimistic IDs. Fix: after `sendMessage` resolves, ensure real message ID replaces optimistic ID and is stored in a `messageIdMap` ref keyed by optimistic ID.
- **Reactions toggle** — Backend `addReaction` always appends without checking existing. Frontend must check if user already reacted to the same emoji using the current backend state before calling add vs remove.
- **Seen indicator** — Full message refresh every 2s correctly merges seenBy. But `markSeen` optimistic update needs to also call backend `markMessagesSeen` and the polling must pick up the updated seenBy from full refresh. Ensure `fetchMessages(chatId, 0n)` runs after `markSeen` completes.
- **Media/Voice messages** — `URL.createObjectURL` creates blob URLs that die on page refresh. Fix: for voice, convert Blob to base64 data URL before storing. For images < 2MB, same approach. For larger images, show a placeholder with a warning that media won't persist.
- **ChatContext `searchUsers`** — Currently calls local `localSearchUsers` fallback then backend. Reverse this: always hit backend first, fallback to local only if actor unavailable.
- **Professional UI** — Fix MessageBubble seen indicator positioning, improve SettingsPage layout, ProfilePage stats, and add better empty states with proper responsive styling.

### Remove
- `flushSync` usage (already removed in v11 but verify it's completely gone)
- Stale localStorage-only search path as primary search method

## Implementation Plan
1. Fix `ChatContext.searchUsers` to always call backend `searchUsersByUsername` + prefix search, deduplicate
2. Add `chatIdToOtherUid` map in ChatContext, populated in `openChat`, read in ChatWindow
3. Ensure message IDs sent to `editMessage`/`deleteMessageForEveryone` are always the real backend IDs (not optimistic)
4. Fix `reactToMessage` to read current reactions from backend state before toggling
5. Add `fetchMessages(chatId, 0n)` call shortly after `markSeen` to confirm seenBy update
6. Convert voice Blob to base64 data URL; images < 1MB to base64 too
7. Polish: MessageBubble seen indicator, Settings, Profile, responsive layout
