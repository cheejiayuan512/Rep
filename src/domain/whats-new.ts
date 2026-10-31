/**
 * A remote "what's new" notice. Edit whats-new.json on the default branch
 * and phones pick it up without a store build. Dismiss is stored on the device.
 */
export interface WhatsNewNotice {
  id: string;
  title: string;
  bullets: string[];
}

/** GitHub raw file on the default branch. Override with app.json extra.whatsNewUrl. */
export const DEFAULT_WHATS_NEW_URL = 'https://raw.githubusercontent.com/cheejiayuan512/Rep/master/whats-new.json';

const FETCH_MS = 5000;

export function parseWhatsNew(value: unknown): WhatsNewNotice | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as { id?: unknown; title?: unknown; bullets?: unknown };
  if (typeof record.id !== 'string' || record.id.trim() === '') {
    return null;
  }
  if (typeof record.title !== 'string' || record.title.trim() === '') {
    return null;
  }
  if (!Array.isArray(record.bullets)) {
    return null;
  }
  const bullets = record.bullets
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 8);
  if (bullets.length === 0) {
    return null;
  }
  return { bullets, id: record.id.trim(), title: record.title.trim() };
}

/** True when this notice has not been dismissed yet. */
export function shouldShowWhatsNew(notice: WhatsNewNotice, seenId: string): boolean {
  return notice.id !== seenId;
}

export async function fetchWhatsNew(url: string, signal?: AbortSignal): Promise<WhatsNewNotice | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) {
      return null;
    }
    return parseWhatsNew(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
