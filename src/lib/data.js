const BASE = import.meta.env.BASE_URL || '/';

async function fetchJson(relPath, { cacheBust = false } = {}) {
  const path = relPath.replace(/^\//, '');
  const url = `${BASE}${path}${cacheBust ? `${path.includes('?') ? '&' : '?'}_=${Date.now()}` : ''}`;
  const res = await fetch(url, cacheBust ? { cache: 'no-store' } : undefined);
  if (!res.ok) throw new Error(`加载失败 ${url}: ${res.status}`);
  return res.json();
}

function normalizeUserPayload(data) {
  return {
    ratings: data?.ratings && typeof data.ratings === 'object' ? data.ratings : {},
    favorites:
      data?.favorites && typeof data.favorites === 'object' ? data.favorites : {},
    categories_all: Array.isArray(data?.categories_all) ? data.categories_all : [],
    category:
      data?.category && typeof data.category === 'object' ? data.category : {},
  };
}

export async function loadIssues() {
  const manifest = await fetchJson('data/issues/manifest.json');
  const chunks = await Promise.all(
    (manifest.chunks || []).map((name) => fetchJson(`data/issues/${name}`))
  );
  const issues = chunks.flat().map((issue) => ({
    ...issue,
    issueNumber: String(issue.issueNumber),
    body: issue.body || issue.content || '',
    html: issue.html || '',
  }));
  issues.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
  return { manifest, issues };
}

/** 静态站点上的 user.json（可能落后于刚 push 的仓库，仅作无 Token 兜底） */
export async function loadUserData() {
  try {
    const data = await fetchJson('data/user.json', { cacheBust: true });
    return normalizeUserPayload(data);
  } catch {
    return normalizeUserPayload({});
  }
}

export { normalizeUserPayload };
