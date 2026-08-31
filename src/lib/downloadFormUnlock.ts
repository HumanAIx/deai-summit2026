const STORAGE_PREFIX = 'deai:downloads-form-unlock:';

export type DownloadFormUnlock = {
  email: string;
  unlockedAt: string;
};

function storageKey(formIdOrSlug: string): string {
  return `${STORAGE_PREFIX}${formIdOrSlug}`;
}

function readRecord(formIdOrSlug: string): DownloadFormUnlock | null {
  if (!formIdOrSlug || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(formIdOrSlug));
    if (!raw) return null;
    // Legacy unlock flag from earlier builds
    if (raw === '1') return null;
    const parsed = JSON.parse(raw) as Partial<DownloadFormUnlock>;
    if (!parsed?.email || typeof parsed.email !== 'string') return null;
    return {
      email: parsed.email.trim().toLowerCase(),
      unlockedAt: typeof parsed.unlockedAt === 'string' ? parsed.unlockedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeRecord(formIdOrSlug: string, record: DownloadFormUnlock): void {
  if (!formIdOrSlug || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(formIdOrSlug), JSON.stringify(record));
  } catch {
    /* ignore quota / private mode */
  }
}

/** True when this browser already unlocked the given downloads gate form. */
export function isDownloadFormUnlocked(formIdOrSlug: string | null | undefined): boolean {
  if (!formIdOrSlug) return false;
  try {
    const raw = window.localStorage.getItem(storageKey(formIdOrSlug));
    if (!raw) return false;
    if (raw === '1') return true;
    return !!readRecord(formIdOrSlug)?.email;
  } catch {
    return false;
  }
}

/** Email saved when the gate form was completed (if any). */
export function getDownloadFormEmail(formIdOrSlug: string | null | undefined): string | null {
  if (!formIdOrSlug) return null;
  return readRecord(formIdOrSlug)?.email || null;
}

/** Persist unlock + email after a successful gate-form submission. */
export function unlockDownloadForm(
  formIdOrSlug: string | null | undefined,
  email: string,
): void {
  if (!formIdOrSlug || !email?.trim()) return;
  writeRecord(formIdOrSlug, {
    email: email.trim().toLowerCase(),
    unlockedAt: new Date().toISOString(),
  });
}

/** Clear unlock state for downloads gate forms in this browser. */
export function clearDownloadFormUnlock(...ids: Array<string | null | undefined>): void {
  if (typeof window === 'undefined') return;
  try {
    const explicit = ids.filter((id): id is string => !!id);
    if (explicit.length) {
      for (const id of explicit) window.localStorage.removeItem(storageKey(id));
      return;
    }
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) toRemove.push(key);
    }
    for (const key of toRemove) window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
