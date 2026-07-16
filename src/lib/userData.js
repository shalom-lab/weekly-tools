import { ref, computed } from 'vue';
import { loadUserData } from './data.js';
import {
  putJsonFile,
  pullUserDataFromGithub,
  hasToken,
  ALLOWED_USER_DATA_PATH,
} from './github.js';

const LOCAL_KEY = 'weekly-tools-user-local';
const DIRTY_KEY = 'weekly-tools-user-dirty';

function emptyPayload() {
  return {
    ratings: {},
    favorites: {},
    categories_all: [],
    category: {},
  };
}

function normalizeCategoriesAll(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const name = String(raw || '').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

function normalizeCategoryMap(map) {
  if (!map || typeof map !== 'object') return {};
  const out = {};
  for (const [id, arr] of Object.entries(map)) {
    if (!Array.isArray(arr)) continue;
    const names = normalizeCategoriesAll(arr);
    if (names.length) out[String(id)] = names;
  }
  return out;
}

function normalizePayload(data) {
  return {
    ratings: data?.ratings && typeof data.ratings === 'object' ? data.ratings : {},
    favorites:
      data?.favorites && typeof data.favorites === 'object' ? data.favorites : {},
    categories_all: normalizeCategoriesAll(data?.categories_all),
    category: normalizeCategoryMap(data?.category),
  };
}

function readLocal() {
  try {
    return normalizePayload(JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'));
  } catch {
    return emptyPayload();
  }
}

function writeLocal(payload) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(normalizePayload(payload)));
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
const categoriesAll = ref([]);
const category = ref({});
const syncing = ref(false);
const syncError = ref('');
const syncHint = ref('');
const loaded = ref(false);
const pendingSync = ref(false);

let syncLock = null;

function snapshot() {
  return {
    ratings: { ...ratings.value },
    favorites: { ...favorites.value },
    categories_all: [...categoriesAll.value],
    category: Object.fromEntries(
      Object.entries(category.value).map(([k, v]) => [k, [...v]])
    ),
  };
}

function applyPayload(payload) {
  const n = normalizePayload(payload);
  ratings.value = n.ratings;
  favorites.value = n.favorites;
  categoriesAll.value = n.categories_all;
  category.value = n.category;
}

function persistLocal() {
  writeLocal(snapshot());
  markDirty();
  pendingSync.value = true;
  syncHint.value = hasToken()
    ? '有未同步的本地改动'
    : '已保存在本机；配置 Token 后可同步';
}

/**
 * 启动时 pull：有 Token 走 GitHub API（最新），否则静态 user.json（防缓存）。
 * 若本地有未推送改动则保留本地，否则以远程覆盖本地。
 */
async function pullRemote() {
  if (hasToken()) {
    try {
      const { payload } = await pullUserDataFromGithub();
      return normalizePayload(payload);
    } catch (err) {
      // Token 无效或网络问题时退回静态文件，不阻断页面
      console.warn('[userData] GitHub pull failed, fallback to static', err);
    }
  }
  return normalizePayload(await loadUserData());
}

export function useUserData() {
  async function init() {
    const remote = await pullRemote();
    const dirty = isDirty();

    if (dirty) {
      // 本会话未推送的改动优先；远程仅作对照，不合并
      applyPayload(readLocal());
      pendingSync.value = true;
      syncHint.value = hasToken() ? '有未同步的本地改动' : '';
    } else {
      // 干净启动：远程为准，刷新本地缓存
      applyPayload(remote);
      writeLocal(remote);
      clearDirty();
      pendingSync.value = false;
      syncHint.value = '';
    }
    loaded.value = true;
  }

  function getRating(issueNumber) {
    const v = ratings.value[String(issueNumber)];
    return typeof v === 'number' ? v : 0;
  }

  function isFavorite(issueNumber) {
    const id = String(issueNumber);
    return getRating(id) !== 0 || favorites.value[id] === true;
  }

  function getCategories(issueNumber) {
    return category.value[String(issueNumber)] || [];
  }

  function hasCategory(issueNumber, name) {
    return getCategories(issueNumber).includes(name);
  }

  async function setRating(issueNumber, stars) {
    const id = String(issueNumber);
    const nextRatings = { ...ratings.value };
    if (!stars) delete nextRatings[id];
    else nextRatings[id] = Math.min(5, Math.max(0, Number(stars) || 0));
    ratings.value = nextRatings;
    persistLocal();
  }

  async function setFavorite(issueNumber, value) {
    const id = String(issueNumber);
    const nextFav = { ...favorites.value };
    const nextRatings = { ...ratings.value };
    if (value) {
      nextFav[id] = true;
    } else {
      delete nextFav[id];
      delete nextRatings[id];
      ratings.value = nextRatings;
    }
    favorites.value = nextFav;
    persistLocal();
  }

  function setCategoriesAll(list) {
    categoriesAll.value = normalizeCategoriesAll(list);
    const allow = new Set(categoriesAll.value);
    const nextMap = {};
    for (const [id, arr] of Object.entries(category.value)) {
      const kept = arr.filter((n) => allow.has(n));
      if (kept.length) nextMap[id] = kept;
    }
    category.value = nextMap;
    persistLocal();
  }

  function toggleCategory(issueNumber, name) {
    const id = String(issueNumber);
    const cat = String(name || '').trim();
    if (!cat || !categoriesAll.value.includes(cat)) return;

    const prev = getCategories(id);
    const next = prev.includes(cat)
      ? prev.filter((n) => n !== cat)
      : [...prev, cat];

    const map = { ...category.value };
    if (next.length) map[id] = next;
    else delete map[id];
    category.value = map;
    persistLocal();
  }

  /** 本地快照整份覆盖远程（force），不做字段合并 */
  async function syncToRepo() {
    if (!hasToken()) {
      syncError.value = '未配置 Token';
      throw new Error(syncError.value);
    }
    if (!pendingSync.value && !isDirty()) {
      syncHint.value = '';
      return;
    }
    if (syncLock) return syncLock;

    syncLock = (async () => {
      syncing.value = true;
      syncError.value = '';
      try {
        const payload = snapshot();
        const { payload: written } = await putJsonFile(
          ALLOWED_USER_DATA_PATH,
          payload,
          `chore: update user data (${new Date().toISOString().slice(0, 10)})`
        );
        applyPayload(written);
        writeLocal(written);
        clearDirty();
        pendingSync.value = false;
        syncHint.value = '已同步';
        setTimeout(() => {
          if (syncHint.value === '已同步') syncHint.value = '';
        }, 2000);
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

  const favoriteIds = computed(() => {
    const ids = new Set();
    for (const id of Object.keys(ratings.value)) {
      if (getRating(id) !== 0) ids.add(id);
    }
    for (const [id, flag] of Object.entries(favorites.value)) {
      if (flag === true) ids.add(id);
    }
    return [...ids];
  });

  return {
    ratings,
    favorites,
    categoriesAll,
    category,
    favoriteIds,
    syncing,
    syncError,
    syncHint,
    pendingSync,
    loaded,
    init,
    getRating,
    isFavorite,
    getCategories,
    hasCategory,
    setRating,
    setFavorite,
    setCategoriesAll,
    toggleCategory,
    syncToRepo,
    hasToken,
  };
}
