import {
  loadSettings,
  getToken,
  hasToken,
  ALLOWED_USER_DATA_PATH,
} from './settings.js';
import { normalizeUserPayload } from './data.js';

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
  const data = await api(
    `/contents/${path}?ref=${encodeURIComponent(settings.branch)}&_=${Date.now()}`
  );
  return { sha: data.sha, content: fromBase64(data.content), path: data.path };
}

/** 从仓库 Contents API 拉取最新 user.json（绕过 Pages 缓存） */
export async function pullUserDataFromGithub() {
  const { sha, content } = await getFile(ALLOWED_USER_DATA_PATH);
  return { sha, payload: normalizeUserPayload(JSON.parse(content)) };
}

/**
 * 整份覆盖写入（force）：始终以传入 data 为准。
 * 409 时只刷新 SHA 重试，不做内容合并，避免删除键被远端加回。
 */
export async function putJsonFile(path, data, message) {
  const safePath = resolveUserDataPath(path);
  const settings = loadSettings();
  const payload = data;
  const content = `${JSON.stringify(payload, null, 2)}\n`;
  const encoded = toBase64(content);

  for (let attempt = 1; attempt <= 6; attempt++) {
    let sha = '';
    try {
      const existing = await getFile(safePath);
      sha = existing.sha;
    } catch (err) {
      if (!String(err.message).includes('404')) throw err;
      sha = '';
    }

    try {
      const result = await api(`/contents/${safePath}`, {
        method: 'PUT',
        body: {
          message,
          content: encoded,
          branch: settings.branch,
          ...(sha ? { sha } : {}),
        },
      });
      return { result, payload };
    } catch (err) {
      const msg = String(err.message);
      if (msg.includes('409') && attempt < 6) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
        continue;
      }
      throw err;
    }
  }
}

export { hasToken, ALLOWED_USER_DATA_PATH };
