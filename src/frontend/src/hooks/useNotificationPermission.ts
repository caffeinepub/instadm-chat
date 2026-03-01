/**
 * useNotificationPermission
 * Manages browser Notification API permission state.
 * Persists "asked" flag in localStorage so we only prompt once.
 */
import { useCallback, useEffect, useState } from "react";

const ASKED_KEY = "notificationPermissionAsked";

export type NotificationPermissionStatus =
  | "granted"
  | "denied"
  | "default"
  | "unsupported";

export function useNotificationPermission() {
  const isSupported = typeof Notification !== "undefined";

  const [permission, setPermission] = useState<NotificationPermissionStatus>(
    isSupported
      ? (Notification.permission as NotificationPermissionStatus)
      : "unsupported",
  );

  const [alreadyAsked, setAlreadyAsked] = useState(
    () => localStorage.getItem(ASKED_KEY) === "true",
  );

  // Sync permission state if it changes externally
  useEffect(() => {
    if (!isSupported) return;

    const syncPermission = () => {
      setPermission(Notification.permission as NotificationPermissionStatus);
    };

    // Check on mount
    syncPermission();

    // Listen for visibility changes — user may have changed setting in browser
    document.addEventListener("visibilitychange", syncPermission);
    return () =>
      document.removeEventListener("visibilitychange", syncPermission);
  }, [isSupported]);

  const requestPermission =
    useCallback(async (): Promise<NotificationPermissionStatus> => {
      if (!isSupported) return "unsupported";

      // Mark as asked
      localStorage.setItem(ASKED_KEY, "true");
      setAlreadyAsked(true);

      try {
        const result = await Notification.requestPermission();
        setPermission(result as NotificationPermissionStatus);
        return result as NotificationPermissionStatus;
      } catch {
        return "denied";
      }
    }, [isSupported]);

  const markAsked = useCallback(() => {
    localStorage.setItem(ASKED_KEY, "true");
    setAlreadyAsked(true);
  }, []);

  return {
    permission,
    requestPermission,
    isSupported,
    alreadyAsked,
    markAsked,
  };
}
