/** 可提前写入的 Token 专用 key（推荐） */
export const TOKEN_STORAGE_KEY = 'weekly-tools-github-token';

/** 其它设置（不含强制依赖 token 字段，但会做旧数据迁移） */
export const SETTINGS_STORAGE_KEY = 'weekly-tools-settings';

export const ALLOWED_USER_DATA_PATH = 'public/data/user.json';

const DEFAULTS = {
  repoOwner: 'shalom-lab',
  repoName: 'weekly-tools',
  branch: 'main',
  userDataPath: ALLOWED_USER_DATA_PATH,
};

function readRawToken() {
  try {
    const direct = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (direct && direct.trim()) return direct.trim();
  } catch {
    /* ignore */
  }
  return '';
}

/** 从旧版 settings JSON 里迁移 token 到独立 key */
function migrateTokenFromLegacySettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    const legacy = String(parsed.githubToken || '').trim();
    if (!legacy) return '';
    localStorage.setItem(TOKEN_STORAGE_KEY, legacy);
    delete parsed.githubToken;
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(parsed));
    return legacy;
  } catch {
    return '';
  }
}

export function getToken() {
  return readRawToken() || migrateTokenFromLegacySettings();
}

export function hasToken() {
  return Boolean(getToken());
}

export function setToken(token) {
  const value = String(token || '').trim();
  if (value) localStorage.setItem(TOKEN_STORAGE_KEY, value);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
  return value;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  // 顺带清掉旧字段，避免再次被迁移回来
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if ('githubToken' in parsed) {
        delete parsed.githubToken;
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(parsed));
      }
    }
  } catch {
    /* ignore */
  }
}

export function loadSettings() {
  const githubToken = getToken();
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULTS, userDataPath: ALLOWED_USER_DATA_PATH, githubToken };
    }
    const parsed = JSON.parse(raw);
    const { ratingsPath, favoritesPath, userDataPath, githubToken: _legacy, ...rest } = parsed;
    return {
      ...DEFAULTS,
      ...rest,
      userDataPath: ALLOWED_USER_DATA_PATH,
      githubToken,
    };
  } catch {
    return { ...DEFAULTS, userDataPath: ALLOWED_USER_DATA_PATH, githubToken };
  }
}

export function saveSettings(partial) {
  const { userDataPath, githubToken, ...rest } = partial || {};
  if (githubToken !== undefined) {
    setToken(githubToken);
  }
  const current = loadSettings();
  const nextMeta = {
    repoOwner: rest.repoOwner ?? current.repoOwner,
    repoName: rest.repoName ?? current.repoName,
    branch: rest.branch ?? current.branch,
    userDataPath: ALLOWED_USER_DATA_PATH,
  };
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextMeta));
  return { ...nextMeta, githubToken: getToken() };
}
