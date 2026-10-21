"use client";

import {
  getUserSavedProfessorsApi,
  toggleUserSavedProfessorApi,
  syncUserSavedProfessorsApi,
} from "./dataService";

const LEGACY_STORAGE_KEY = "rateurprofs_saved_professors";
export const BOOKMARKS_CHANGED_EVENT = "rateurprofs_bookmarks_changed";

let activeUserId: string | null = null;
const userBookmarksCache: Map<string, string[]> = new Map();

function getUserStorageKey(userId: string): string {
  return `rateurprofs_saved_professors_${userId}`;
}

/**
 * Dispatches the custom event so all listening components update immediately.
 */
function dispatchBookmarksChange(
  professorId: string = "",
  isBookmarked: boolean = false,
  allBookmarks: string[] = []
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(BOOKMARKS_CHANGED_EVENT, {
      detail: { professorId, isBookmarked, allBookmarks },
    })
  );
}

/**
 * Loads bookmarks from localStorage for a specific user ID.
 * Automatically migrates legacy global bookmarks if this is the first login.
 */
function loadBookmarksFromStorage(userId: string): string[] {
  if (typeof window === "undefined" || !userId) return [];

  const key = getUserStorageKey(userId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }

    // Check legacy storage for backward-compatibility migration
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      try {
        const legacyParsed = JSON.parse(legacyRaw);
        if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
          localStorage.setItem(key, JSON.stringify(legacyParsed));
          localStorage.removeItem(LEGACY_STORAGE_KEY);
          return legacyParsed;
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  return [];
}

/**
 * Saves bookmarks to localStorage for a specific user ID.
 */
function saveBookmarksToStorage(userId: string, list: string[]): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(getUserStorageKey(userId), JSON.stringify(list));
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Sets the active authenticated user for bookmark scoping.
 * When switching accounts or logging in/out, loads or fetches user-specific bookmarks.
 */
export async function setActiveBookmarkUser(userId: string | null): Promise<void> {
  activeUserId = userId;

  if (!userId) {
    userBookmarksCache.clear();
    dispatchBookmarksChange("", false, []);
    return;
  }

  // 1. Immediately load local cache for this user (0ms UI latency)
  const cached = loadBookmarksFromStorage(userId);
  userBookmarksCache.set(userId, cached);
  dispatchBookmarksChange("", false, cached);

  // 2. Fetch from backend to ensure cross-device synchronization
  try {
    const serverList = await getUserSavedProfessorsApi(userId);
    if (serverList.length > 0) {
      // Merge with local cached to avoid dropping recent saves
      const merged = Array.from(new Set([...serverList, ...cached]));
      userBookmarksCache.set(userId, merged);
      saveBookmarksToStorage(userId, merged);
      dispatchBookmarksChange("", false, merged);
    } else if (cached.length > 0) {
      // Server was empty (e.g. freshly migrated from localStorage), sync local to server
      const synced = await syncUserSavedProfessorsApi(userId, cached);
      const finalList = synced.length > 0 ? synced : cached;
      userBookmarksCache.set(userId, finalList);
      saveBookmarksToStorage(userId, finalList);
      dispatchBookmarksChange("", false, finalList);
    }
  } catch (err) {
    console.warn("[Bookmarks] Error synchronizing bookmarks with server:", err);
  }
}

/**
 * Returns all saved professor IDs for the active user (or specified user).
 * Returns empty array if user is not authenticated.
 */
export function getBookmarks(userId?: string): string[] {
  const uid = userId || activeUserId;
  if (!uid || typeof window === "undefined") return [];

  if (userBookmarksCache.has(uid)) {
    return userBookmarksCache.get(uid) || [];
  }

  const list = loadBookmarksFromStorage(uid);
  userBookmarksCache.set(uid, list);
  return list;
}

/**
 * Checks if a specific professor is bookmarked by the active or specified user.
 */
export function isBookmarked(professorId: string, userId?: string): boolean {
  if (!professorId) return false;
  const list = getBookmarks(userId);
  return list.includes(professorId);
}

/**
 * Toggles bookmark status for a professor.
 * Updates local cache immediately for optimistic UI, and asynchronously persists to database.
 */
export function toggleBookmark(professorId: string, userId?: string): boolean {
  const uid = userId || activeUserId;
  if (!professorId || !uid || typeof window === "undefined") {
    return false;
  }

  const currentList = getBookmarks(uid);
  const exists = currentList.includes(professorId);
  const nextIsBookmarked = !exists;

  const nextList = nextIsBookmarked
    ? [...currentList, professorId]
    : currentList.filter((id) => id !== professorId);

  // Optimistic local update
  userBookmarksCache.set(uid, nextList);
  saveBookmarksToStorage(uid, nextList);

  dispatchBookmarksChange(professorId, nextIsBookmarked, nextList);

  // Background server sync
  toggleUserSavedProfessorApi(uid, professorId)
    .then((res) => {
      if (res && Array.isArray(res.professorIds)) {
        userBookmarksCache.set(uid, res.professorIds);
        saveBookmarksToStorage(uid, res.professorIds);
        dispatchBookmarksChange(professorId, res.isSaved, res.professorIds);
      }
    })
    .catch((err) => {
      console.error("[Bookmarks] Failed to persist bookmark toggle to server:", err);
    });

  return nextIsBookmarked;
}

/**
 * Refreshes saved professors from server for a user.
 */
export async function refreshBookmarksFromServer(userId?: string): Promise<string[]> {
  const uid = userId || activeUserId;
  if (!uid) return [];
  try {
    const serverList = await getUserSavedProfessorsApi(uid);
    userBookmarksCache.set(uid, serverList);
    saveBookmarksToStorage(uid, serverList);
    dispatchBookmarksChange("", false, serverList);
    return serverList;
  } catch (err) {
    console.error("[Bookmarks] Failed to refresh bookmarks:", err);
    return getBookmarks(uid);
  }
}
