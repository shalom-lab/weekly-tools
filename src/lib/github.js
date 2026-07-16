import {
  loadSettings,
  getToken,
  hasToken,
  ALLOWED_USER_DATA_PATH,
} from './settings.js';

const encoder = new TextEncoder();

function toBase64(str) {
  const bytes = encoder.encode(str);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function fromBase64(b64) {
  const binary = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function resolveUserDataPath(path) {
  const normalized = String(path || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
  if (normalized !== ALLOWED_USER_DATA_PATH) {
    throw new Error(`仅允许写入 ${ALLOWED_USER_DATA_PATH}`);
  }
  return ALLOWED_USER_DATA_PATH;
}

function parseShaFromConflict(message) {
  const m = String(message).match(/does not match ([a-f0-9]{40})/i);
  return m ? m[1] : '';
}

async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  if (!token) {
    throw new Error('未检测到 Token：请先写入 localStorage 或在「设置」中填写');
  }

  const settings = loadSettings();
  const url = `https://api.github.com/repos/${settings.repoOwner}/${settings.repoName}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text.slice(0, 240)}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function getFile(path) {
  const settings = loadSettings();
  // 加时间戳避免中间层缓存旧 sha
  const data = await api(
    `/contents/${path}?ref=${encodeURIComponent(settings.branch)}&_=${Date.now()}`
  );
  return { sha: data.sha, content: fromBase64(data.content), path: data.path };
}

/**
 * 更新 user.json。409 = 远端 sha 已变（常见于连续快速同步），
 * 会重新 GET sha / 从错误信息解析 sha 后重试。
 */
export async function putJsonFile(path, data, message) {
  const safePath = resolveUserDataPath(path);
  const settings = loadSettings();
  const content = `${JSON.stringify(data, null, 2)}\n`;
  const encoded = toBase64(content);
  let hintSha = '';

  for (let attempt = 1; attempt <= 5; attempt++) {
    let sha = hintSha;
    hintSha = '';

    if (!sha) {
      try {
        const existing = await getFile(safePath);
        sha = existing.sha;
      } catch (err) {
        if (!String(err.message).includes('404')) throw err;
      }
    }

    try {
      return await api(`/contents/${safePath}`, {
        method: 'PUT',
        body: {
          message,
          content: encoded,
          branch: settings.branch,
          ...(sha ? { sha } : {}),
        },
      });
    } catch (err) {
      const msg = String(err.message);
      const conflictSha = parseShaFromConflict(msg);
      if ((msg.includes('409') || conflictSha) && attempt < 5) {
        hintSha = conflictSha;
        await new Promise((r) => setTimeout(r, 250 * attempt));
        continue;
      }
      throw err;
    }
  }
}

export { hasToken, ALLOWED_USER_DATA_PATH };
