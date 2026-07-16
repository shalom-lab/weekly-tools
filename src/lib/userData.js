import { ref, computed } from 'vue';
import { loadUserData } from './data.js';
import { putJsonFile, hasToken, ALLOWED_USER_DATA_PATH } from './github.js';

const LOCAL_KEY = 'weekly-tools-user-local';
const DIRTY_KEY = 'weekly-tools-user-dirty';
const SYNC_DEBOUNCE_MS = 1500;

function emptyPayload() {
  return { ratings: {}, favorites: {} };
}

function readLocal() {
  try {
    const data = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
    return {
      ratings: data.ratings && typeof data.ratings === 'object' ? data.ratings : {},
      favorites: data.favorites && typeof data.favorites === 'object' ? data.favorites : {},
    };
  } catch {
    return emptyPayload();
  }
}

function writeLocal(payload) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(payload));
}

function isDirty() {
  return localStorage.getItem(DIRTY_KEY) === '1';
}

function markDirty() {
  localStorage.setItem(DIRTY_KEY, '1');
}

function clearDirty() {
  localStorage.removeItem(DIRTY_KEY);
}

const ratings = ref({});
const favorites = ref({});
const syncing = ref(false);
const syncError = ref('');
const syncHint = ref('');
const loaded = ref(false);
const pendingSync = ref(false);

let syncTimer = null;
let syncLock = null;

function snapshot() {
  return { ratings: { ...ratings.value }, favorites: { ...favorites.value } };
}

function persistLocal() {
  writeLocal(snapshot());
  markDirty();
  pendingSync.value = true;
}

export function useUserData() {
  async function init() {
    const remote = await loadUserData();
    if (isDirty()) {
      const local = readLocal();
      ratings.value = local.ratings;
      favorites.value = local.favorites;
      pendingSync.value = true;
      syncHint.value = hasToken()
        ? '有未同步的本地改动，将自动写回仓库'
        : '已保存在本机；填写 Token 后可同步到仓库';
    } else {
      ratings.value = remote.ratings;
      favorites.value = remote.favorites;
      writeLocal(snapshot());
      pendingSync.value = false;
      syncHint.value = '';
    }
    loaded.value = true;

    if (isDirty() && hasToken()) {
      scheduleSync();
    }
  }

  function getRating(issueNumber) {
    const v = ratings.value[String(issueNumber)];
    return typeof v === 'number' ? v : 0;
  }

  function isFavorite(issueNumber) {
    return Boolean(favorites.value[String(issueNumber)]);
  }

  async function setRating(issueNumber, stars) {
    const id = String(issueNumber);
    const next = { ...ratings.value };
    if (!stars) delete next[id];
    else next[id] = Math.min(5, Math.max(0, Number(stars) || 0));
    ratings.value = next;
    persistLocal();
    if (!hasToken()) {
      syncHint.value = '已保存在本机；到「设置」填写 Token 可同步到仓库';
      return;
    }
    syncHint.value = '将在片刻后同步到仓库…';
    scheduleSync();
  }

  async function setFavorite(issueNumber, value) {
    const id = String(issueNumber);
    const next = { ...favorites.value };
    if (value) next[id] = true;
    else delete next[id];
    favorites.value = next;
    persistLocal();
    if (!hasToken()) {
      syncHint.value = '已保存在本机；到「设置」填写 Token 可同步到仓库';
      return;
    }
    syncHint.value = '将在片刻后同步到仓库…';
    scheduleSync();
  }

  function scheduleSync() {
    syncError.value = '';
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      syncTimer = null;
      syncToRepo().catch(() => {});
    }, SYNC_DEBOUNCE_MS);
  }

  async function syncToRepo() {
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    if (!hasToken()) {
      syncError.value = '未配置 Token';
      return;
    }
    // 串行化，避免连续评分打出多个 PUT 互相 409
    if (syncLock) return syncLock;

    syncLock = (async () => {
      syncing.value = true;
      syncError.value = '';
      try {
        const payload = snapshot();
        await putJsonFile(
          ALLOWED_USER_DATA_PATH,
          payload,
          `chore: update user data (${new Date().toISOString().slice(0, 10)})`
        );
        writeLocal(payload);
        clearDirty();
        pendingSync.value = false;
        syncHint.value = '已同步到仓库';
        setTimeout(() => {
          if (syncHint.value === '已同步到仓库') syncHint.value = '';
        }, 2500);
      } catch (err) {
        syncError.value = err.message || String(err);
        syncHint.value = '';
        throw err;
      } finally {
        syncing.value = false;
        syncLock = null;
      }
    })();

    return syncLock;
  }

  const favoriteIds = computed(() =>
    Object.keys(favorites.value).filter((k) => favorites.value[k])
  );

  return {
    ratings,
    favorites,
    favoriteIds,
    syncing,
    syncError,
    syncHint,
    pendingSync,
    loaded,
    init,
    getRating,
    isFavorite,
    setRating,
    setFavorite,
    syncToRepo,
    hasToken,
  };
}
