const DEFAULT_MAX_AGE_SECONDS = 365 * 24 * 60 * 60; // 1 year

export const APP_COOKIE_KEYS = [
  'mplayer_vfd_settings',
  'mplayer_audio_settings',
  'mplayer_tuner_settings',
  'mplayer_jellyfin_config',
  'mplayer_jellyfin_device_id'
] as const;

export function getCookieItem(key: string): string | null {
  try {
    if (typeof document !== 'undefined' && typeof document.cookie === 'string' && document.cookie.length > 0) {
      const encodedKey = encodeURIComponent(key) + '=';
      const cookies = document.cookie.split(';');
      for (const rawCookie of cookies) {
        const cookie = rawCookie.trim();
        if (cookie.startsWith(encodedKey)) {
          const rawVal = cookie.substring(encodedKey.length);
          return decodeURIComponent(rawVal);
        }
      }
    }
  } catch (e) {
    // Ignore cookie access errors in restricted environments
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const fallback = window.localStorage.getItem(key);
      if (fallback !== null) {
        // Sync existing localStorage value into cookie
        setCookieItem(key, fallback);
        return fallback;
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }

  return null;
}

export function setCookieItem(key: string, value: string, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS): void {
  try {
    if (typeof document !== 'undefined') {
      const encodedKey = encodeURIComponent(key);
      const encodedVal = encodeURIComponent(value);
      document.cookie = `${encodedKey}=${encodedVal}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
    }
  } catch (e) {
    // Ignore cookie write errors
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (e) {
    // Ignore localStorage write errors
  }
}

export function removeCookieItem(key: string): void {
  try {
    if (typeof document !== 'undefined') {
      const encodedKey = encodeURIComponent(key);
      document.cookie = `${encodedKey}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    }
  } catch (e) {
    // Ignore cookie delete errors
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (e) {
    // Ignore localStorage delete errors
  }
}

export function clearAllAppCookies(): void {
  for (const key of APP_COOKIE_KEYS) {
    removeCookieItem(key);
  }
}
