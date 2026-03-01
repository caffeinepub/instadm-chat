# Linkr

## Current State
- Full-stack ICP app with Internet Identity authentication
- User profiles stored on ICP backend (createOrUpdateUserProfile, getUserProfile, searchUsersByUsernamePrefix)
- Chat/messages stored ONLY in localStorage — this is why real-time cross-browser chat doesn't work
- Login page exists but is plain/minimal
- UI has dark/light mode toggle but no vibrant color palette
- No delete account functionality
- Typing indicators and seen receipts only work within same browser session

## Requested Changes (Diff)

### Add
- ICP backend: full chat and message storage (chats, messages as stable maps)
- Backend APIs: sendMessage, getMessages, getChatMessages, getOrCreateChat, getChats, setTypingStatus, getTypingStatus, markMessagesSeen, deleteAccount
- Real-time polling (every 1.5s) to fetch latest messages and typing status from ICP backend
- Colorful, vibrant login page redesign with gradient backgrounds, animated elements, feature highlights
- Delete account option in Settings page (with confirmation dialog)
- Instagram-style seen indicator showing profile pictures of who has seen the message
- Improved typing indicator (animated dots with username)
- Additional features: message reactions stored on backend, online status synced to backend

### Modify
- ChatContext: replace localStorage message/chat operations with ICP backend calls + local cache for optimistic UI
- chatService.ts: keep as local cache layer only, ICP backend is source of truth
- LoginPage: complete visual redesign — colorful gradient hero, animated bubbles, vibrant CTA button
- SettingsPage: add "Delete Account" section with confirmation modal
- index.css: add vibrant color mood — electric purple-to-blue-to-cyan gradient palette for dark mode accents
- MessageBubble: enhance seen indicator with colored dots (blue when seen, like Instagram)
- AuthContext: add deleteAccount function

### Remove
- Periodic sync from localStorage (the 2-second interval that simulates real-time)

## Implementation Plan
1. Regenerate Motoko backend with chat/message storage, typing, seen, deleteAccount
2. Update ChatContext to call ICP backend for all chat/message operations; use 1.5s polling
3. Update AuthContext to add deleteAccount
4. Redesign LoginPage with vibrant colorful gradient, animated floating bubbles, bold typography
5. Update SettingsPage with delete account option + confirmation dialog
6. Update index.css with vibrant dark-mode color palette (purple/pink/cyan accents)
7. Enhance MessageBubble seen indicator (blue checkmarks like Instagram, "Seen" label)
8. Validate, build, deploy
