const memoryStore = new Map();
let storageWarningShown = false;

function getStorage() {
  try {
    const probe = "__kavalab_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    if (!storageWarningShown) {
      console.warn("localStorage недоступний; використовується пам'ять вкладки.");
      storageWarningShown = true;
    }
    return memoryStore;
  }
}

export function readStorage(key, fallback) {
  const storage = getStorage();
  try {
    const raw = storage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  const storage = getStorage();
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(key) {
  try {
    getStorage().removeItem(key);
  } catch {
    return false;
  }
  return true;
}
