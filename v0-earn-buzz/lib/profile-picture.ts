"use client";

import { persistUserSession } from "@/lib/session-client";
import { safeParse } from "@/lib/safe-storage";

export const USER_KEY = "tivexx-user";
export const USER_UPDATED_EVENT = "tivexx:update";

export function getStoredUser<T = any>(): T | null {
  try {
    return safeParse<T>(localStorage.getItem(USER_KEY), null as any);
  } catch {
    return null;
  }
}

/** Broadcast so dashboard + profile round avatars refresh instantly (same tab + other tabs). */
export function broadcastUserUpdate(user: any) {
  try {
    window.dispatchEvent(new CustomEvent(USER_UPDATED_EVENT, { detail: { user } }));
  } catch {}
}

/** Persist user to localStorage + session cookie and broadcast. Returns true on success. */
export function saveStoredUser(user: any): boolean {
  try {
    persistUserSession(user);
  } catch {}
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    return false;
  }
  broadcastUserUpdate(user);
  return true;
}

/** Downscale + JPEG-compress an image file so base64 fits localStorage quota. */
export function fileToCompressedDataUrl(file: File, maxSize = 256, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-failed"));
    reader.onload = () => {
      const src = String(reader.result || "");
      const img = new Image();
      img.onerror = () => reject(new Error("decode-failed"));
      img.onload = () => {
        try {
          const scale = Math.min(1, maxSize / Math.max(img.width || 1, img.height || 1));
          const w = Math.max(1, Math.round((img.width || maxSize) * scale));
          const h = Math.max(1, Math.round((img.height || maxSize) * scale));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(src);
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          // JPEG keeps avatars small (~15-40KB). Fall back to original on failure.
          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch {
          resolve(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Single entry-point: compress file → store in tivexx-user.profilePicture
 * (localStorage + cookie) → broadcast. Used by dashboard + profile.
 */
export async function saveProfilePictureFromFile(file: File): Promise<{ ok: boolean; dataUrl?: string; error?: string }> {
  if (typeof window === "undefined") return { ok: false, error: "no-window" };
  if (!file || !file.type.startsWith("image/")) return { ok: false, error: "not-image" };
  try {
    const dataUrl = await fileToCompressedDataUrl(file);
    const current = getStoredUser<any>() || {};
    const updated = { ...current, profilePicture: dataUrl };
    const saved = saveStoredUser(updated);
    if (!saved) return { ok: false, error: "quota" };
    return { ok: true, dataUrl };
  } catch {
    return { ok: false, error: "failed" };
  }
}

/** Subscribe to avatar/user changes (same-tab events + cross-tab storage). */
export function subscribeToUserUpdates(onUser: (user: any | null) => void) {
  const onCustom = (e: Event) => {
    try {
      const detail = (e as CustomEvent)?.detail?.user;
      if (detail) {
        onUser(detail);
        return;
      }
    } catch {}
    onUser(getStoredUser());
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key !== USER_KEY) return;
    try {
      onUser(e.newValue ? (JSON.parse(e.newValue) as any) : null);
    } catch {
      onUser(null);
    }
  };
  window.addEventListener(USER_UPDATED_EVENT, onCustom as EventListener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(USER_UPDATED_EVENT, onCustom as EventListener);
    window.removeEventListener("storage", onStorage);
  };
}
