/**
 * Browser Notification Service for Linkr
 * Handles native browser push notifications when the window is not focused
 * or the user is viewing a different chat.
 */

export type MessagePreviewType =
  | "text"
  | "image"
  | "video"
  | "voice"
  | "file"
  | "gif";

function getMessagePreview(text: string, type: MessagePreviewType): string {
  switch (type) {
    case "image":
      return "📷 Photo";
    case "video":
      return "🎥 Video";
    case "voice":
      return "🎤 Voice message";
    case "file":
      return "📎 File";
    case "gif":
      return "🎞️ GIF";
    default:
      return text.length > 80 ? `${text.slice(0, 80)}…` : text;
  }
}

/**
 * Show a native browser notification for a new message.
 * Respects:
 *  - Notification.permission must be 'granted'
 *  - Only fires when document is hidden OR active chat != incoming chat
 */
export function showMessageNotification(
  senderName: string,
  messageText: string,
  chatId: string,
  messageType: MessagePreviewType = "text",
  activeChatId: string | null = null,
  onClick?: () => void,
): void {
  // Guard: browser support
  if (typeof Notification === "undefined") return;

  // Guard: permission must be granted
  if (Notification.permission !== "granted") return;

  // Guard: don't show if user is actively viewing this chat
  const isVisible = document.visibilityState === "visible";
  const isActiveChat = activeChatId === chatId;
  if (isVisible && isActiveChat) return;

  const body = getMessagePreview(messageText, messageType);

  try {
    const options: NotificationOptions & { renotify?: boolean } = {
      body: `${senderName}: ${body}`,
      icon: "/favicon.ico",
      tag: chatId, // group notifications by chat so they don't pile up
      silent: false,
    };
    // renotify is a valid Notification option but not in all TypeScript lib types
    (options as Record<string, unknown>).renotify = true;
    const notification = new Notification("Linkr — New Message", options);

    notification.onclick = () => {
      window.focus();
      notification.close();
      if (onClick) onClick();
    };

    // Auto-close after 6 seconds
    setTimeout(() => notification.close(), 6000);
  } catch {
    // Silently fail (e.g., notification blocked mid-session)
  }
}

/**
 * Show a native browser notification for a new group message.
 */
export function showGroupNotification(
  senderName: string,
  groupName: string,
  messageText: string,
  groupId: string,
  messageType: MessagePreviewType = "text",
  activeGroupChatId: string | null = null,
  onClick?: () => void,
): void {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

  const isVisible = document.visibilityState === "visible";
  const isActiveGroup = activeGroupChatId === groupId;
  if (isVisible && isActiveGroup) return;

  const body = getMessagePreview(messageText, messageType);

  try {
    const options: NotificationOptions & { renotify?: boolean } = {
      body: `${senderName}: ${body}`,
      icon: "/favicon.ico",
      tag: `group_${groupId}`,
      silent: false,
    };
    (options as Record<string, unknown>).renotify = true;
    const notification = new Notification(`Linkr — ${groupName}`, options);

    notification.onclick = () => {
      window.focus();
      notification.close();
      if (onClick) onClick();
    };

    setTimeout(() => notification.close(), 6000);
  } catch {
    // Silently fail
  }
}
