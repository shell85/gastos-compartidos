const URL_KEY = 'expenses_app.supabase_url';
const KEY_KEY = 'expenses_app.supabase_key';
const CURRENT_USER_KEY = 'expenses_app.current_user';

export interface StoredConfig {
  url: string;
  key: string;
}

export function getStoredConfig(): StoredConfig | null {
  const url = localStorage.getItem(URL_KEY)?.trim();
  const key = localStorage.getItem(KEY_KEY)?.trim();
  return url && key ? { url, key } : null;
}

export function setStoredConfig(config: StoredConfig): void {
  localStorage.setItem(URL_KEY, config.url.trim());
  localStorage.setItem(KEY_KEY, config.key.trim());
}

export function clearStoredConfig(): void {
  localStorage.removeItem(URL_KEY);
  localStorage.removeItem(KEY_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function getStoredCurrentUserId(): string | null {
  return localStorage.getItem(CURRENT_USER_KEY);
}

export function setStoredCurrentUserId(userId: string): void {
  localStorage.setItem(CURRENT_USER_KEY, userId);
}
