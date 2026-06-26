'use client';

const GUEST_TOKEN_KEY = 'm360_guest_token';

/**
 * Get or create a guest token for cart operations.
 * Stored in localStorage, persists across sessions.
 * Used by unauthenticated users to maintain a cart without logging in.
 */
export function getGuestToken(): string {
  if (typeof window === 'undefined') return '';

  let token = localStorage.getItem(GUEST_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(GUEST_TOKEN_KEY, token);
  }
  return token;
}

/**
 * Remove the guest token (e.g., after merging into a user cart on login).
 */
export function clearGuestToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_TOKEN_KEY);
}
