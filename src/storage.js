/**
 * Never-throwing JSON wrapper around localStorage. The backend is looked up on every
 * call, so importing this module has no side effects and private mode cannot crash the game.
 * @module storage
 */

/**
 * @typedef {object} StorageBackend
 * @property {(key: string) => string | null} getItem
 * @property {(key: string, value: string) => void} setItem
 */

/**
 * @typedef {object} SafeStorage
 * @property {(key: string, fallback: any) => any} get - Parsed value, or `fallback` on any failure.
 * @property {(key: string, value: any) => boolean} set - Whether the value was saved.
 */

function browserBackend() {
  return globalThis.localStorage;
}

/**
 * Creates a safe storage helper.
 * @param {() => StorageBackend | null | undefined} [getBackend] - Defaults to `localStorage`.
 * @returns {SafeStorage}
 */
export function createStorage(getBackend = browserBackend) {
  return {
    get(key, fallback) {
      try {
        const raw = getBackend()?.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        const backend = getBackend();
        if (!backend) return false;
        backend.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
  };
}

/** Shared helper backed by the browser's localStorage. */
export const storage = createStorage();
