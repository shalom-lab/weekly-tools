import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SOURCE_OWNER = 'ruanyf';
const SOURCE_REPO = 'weekly';
const DATA_DIR = path.join(__dirname, 'public', 'data');
const ISSUES_DIR = path.join(DATA_DIR, 'issues');
const MANIFEST_FILE = path.join(ISSUES_DIR, 'manifest.json');

/** Soft limit per chunk file (~40MB), leave headroom under GitHub's 50MB warning / 100MB hard limit */
const MAX_CHUNK_BYTES = 40 * 1024 * 1024;
const TITLE_FILTER = /自荐|推荐/;

function getToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
}

async function ensureDirs() {
  await fs.mkdir(ISSUES_DIR, { recursive: true });
}

async function loadManifest() {
  try {
    return JSON.parse(await fs.readFile(MANIFEST_FILE, 'utf8'));
  } catch {
    return { version: 2, chunks: [], count: 0, updatedAt: null };
  }
}

async function loadAllIssues() {
  const manifest = await loadManifest();
  const issues = [];
  for (const chunk of manifest.chunks || []) {
    try {
      const file = path.join(ISSUES_DIR, chunk);
      const data = JSON.parse(await fs.readFile(file, 'utf8'));
      issues.push(...data);
    } catch (err) {
      console.warn(`跳过损坏分片 ${chunk}:`, err.message);
    }
  }
  return { manifest, issues };
}

function chunkKeyForIssue(issue) {
  const year = new Date(issue.datetime).getUTCFullYear();
  return Number.isFinite(year) ? String(year) : 'unknown';
}

function buildChunks(issues) {
  const byYear = new Map();
  for (const issue of issues) {
    const key = chunkKeyForIssue(issue);
    if (!byYear.has(key)) byYear.set(key, []);
    byYear.get(key).push(issue);
  }

  const chunks = [];
  const sortedYears = [...byYear.keys()].sort();

  for (const year of sortedYears) {
    const list = byYear.get(year);
    list.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

    let part = 0;
    let bucket = [];

    const flush = () => {
      if (!bucket.length) return;
      const name = part === 0 ? `${year}.json` : `${year}-${part}.json`;
      chunks.push({ name, issues: bucket });
      part += 1;
      bucket = [];
    };

    for (const issue of list) {
      bucket.push(issue);
      const size = Buffer.byteLength(JSON.stringify(bucket), 'utf8');
      if (size >= MAX_CHUNK_BYTES) {
        if (bucket.length > 1) {
          const last = bucket.pop();
          flush();
          bucket.push(last);
        } else {
          console.warn(`单条 issue #${issue.issueNumber} 接近分片上限，仍写入`);
          flush();
        }
      }
    }
    flush();
  }

  return chunks;
}

async function saveIssues(issues) {
  await ensureDirs();
  const chunks = buildChunks(issues);
  const chunkNames = chunks.map((c) => c.name);

  const existing = await fs.readdir(ISSUES_DIR).catch(() => []);
  for (const file of existing) {
    if (file === 'manifest.json') continue;
    if (file.endsWith('.json') && !chunkNames.includes(file)) {
      await fs.unlink(path.join(ISSUES_DIR, file));
      console.log(`删除旧分片: ${file}`);
    }
  }

  for (const chunk of chunks) {
    const file = path.join(ISSUES_DIR, chunk.name);
    const body = JSON.stringify(chunk.issues);
    await fs.writeFile(file, body, 'utf8');
    const mb = (Buffer.byteLength(body, 'utf8') / 1024 / 1024).toFixed(2);
    console.log(`写入 ${chunk.name}: ${chunk.issues.length} 条, ${mb} MB`);
  }

  const withHtml = issues.filter((i) => i.html).length;
  const manifest = {
    version: 2,
    chunks: chunkNames,
    count: issues.length,
    withHtml,
    hasHtml: withHtml > 0,
    updatedAt: new Date().toISOString(),
    maxChunkBytes: MAX_CHUNK_BYTES,
  };
  await fs.writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`manifest: ${issues.length} 条, html ${withHtml}, ${chunkNames.length} 个分片`);
}

async function githubRequest(url, { method = 'GET', body, accept } = {}) {
  const headers = {
    Accept: accept || 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'weekly-tools-crawler',
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 403 || res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after')) || 0;
      const reset = Number(res.headers.get('x-ratelimit-reset')) || 0;
      const waitSec = retryAfter || Math.max(reset - Math.floor(Date.now() / 1000), 5);
      console.warn(`限流 ${res.status}，等待 ${waitSec}s 后重试 (${attempt}/5)`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API ${res.status}: ${text.slice(0, 300)}`);
    }

    return res;
  }

  throw new Error(`GitHub API 重试失败: ${url}`);
}

function parseLinkNext(linkHeader) {
  if (!linkHeader) return null;
  const match = linkHeader
    .split(',')
    .map((s) => s.trim())
    .find((s) => s.includes('rel="next"'));
  if (!match) return null;
  const url = match.match(/<([^>]+)>/);
  return url ? url[1] : null;
}

/** 用 GitHub GFM 渲染，保留图片与相对链接解析（context = 仓库） */
async function renderMarkdownHtml(markdown) {
  if (!markdown) return '';
  const res = await githubRequest('https://api.github.com/markdown', {
    method: 'POST',
    accept: 'text/html',
    body: {
      text: markdown,
      mode: 'gfm',
      context: `${SOURCE_OWNER}/${SOURCE_REPO}`,
    },
  });
  return res.text();
}

async function fetchSourceIssues({ since } = {}) {
  const results = [];
  let url = `https://api.github.com/repos/${SOURCE_OWNER}/${SOURCE_REPO}/issues?state=all&per_page=100&sort=created&direction=desc`;
  if (since) url += `&since=${encodeURIComponent(since)}`;

  let page = 1;
  while (url) {
    console.log(`拉取第 ${page} 页...`);
    const res = await githubRequest(url);
    const items = await res.json();

    for (const item of items) {
      if (item.pull_request) continue;
      if (!TITLE_FILTER.test(item.title || '')) continue;

      results.push({
        title: item.title,
        issueNumber: String(item.number),
        datetime: item.created_at,
        author: item.user?.login || '',
        body: item.body || '',
      });
    }

    url = parseLinkNext(res.headers.get('link'));
    page += 1;

    if (page > 200) {
      console.warn('分页超过 200，停止以防异常');
      break;
    }
  }

  return results;
}

async function ensureUserDataFiles() {
  await ensureDirs();
  const file = path.join(DATA_DIR, 'user.json');
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(
      file,
      `${JSON.stringify(
        {
          ratings: {},
          favorites: {},
          categories_all: [],
          category: {},
        },
        null,
        2
      )}\n`,
      'utf8'
    );
    console.log('初始化 user.json');
  }
}

function dedupeByIssueNumber(issues) {
  const map = new Map();
  for (const issue of issues) {
    map.set(String(issue.issueNumber), {
      ...issue,
      issueNumber: String(issue.issueNumber),
      body: issue.body || issue.content || '',
      html: issue.html || '',
    });
  }
  return [...map.values()];
}

async function attachHtml(issues, { force = false } = {}) {
  const need = issues.filter((i) => force || !i.html);
  console.log(`渲染 HTML: ${need.length} 条`);
  for (let i = 0; i < need.length; i++) {
    const issue = need[i];
    try {
      issue.html = await renderMarkdownHtml(issue.body || '');
      if ((i + 1) % 10 === 0 || i === need.length - 1) {
        console.log(`  HTML ${i + 1}/${need.length}`);
      }
      // 轻微节流，降低 secondary rate limit
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.warn(`渲染失败 #${issue.issueNumber}:`, err.message);
      issue.html = issue.html || '';
    }
  }
}

async function main() {
  try {
    await ensureUserDataFiles();

    const { issues: existing } = await loadAllIssues();
    const base = dedupeByIssueNumber(existing);
    const existingIds = new Set(base.map((i) => String(i.issueNumber)));
    console.log(`已有 ${base.length} 条（含 html ${base.filter((i) => i.html).length}）`);

    let since;
    if (base.length) {
      const newest = base.reduce((a, b) =>
        new Date(a.datetime) > new Date(b.datetime) ? a : b
      );
      const d = new Date(newest.datetime);
      d.setUTCDate(d.getUTCDate() - 14);
      since = d.toISOString();
      console.log(`增量 since=${since}（回溯 14 天）`);
    } else {
      console.log('全量抓取（首次）');
    }

    if (!getToken()) {
      console.warn('未设置 GITHUB_TOKEN：未认证限额较低，建议配置 token');
    }

    const fetched = await fetchSourceIssues({ since });
    console.log(`API 命中过滤后 ${fetched.length} 条`);

    const uniqueNew = fetched.filter((i) => !existingIds.has(String(i.issueNumber)));
    console.log(`其中新增 ${uniqueNew.length} 条`);

    const fetchedMap = new Map(fetched.map((i) => [String(i.issueNumber), i]));
    const toRender = [];

    const merged = base.map((old) => {
      const fresh = fetchedMap.get(String(old.issueNumber));
      if (!fresh) return old;
      const bodyChanged = (fresh.body || '') !== (old.body || '');
      const next = {
        ...old,
        title: fresh.title,
        datetime: fresh.datetime || old.datetime,
        author: fresh.author || old.author,
        body: fresh.body,
        // 正文没变则保留原 html，避免被空字段冲掉
        html: bodyChanged ? '' : old.html || '',
      };
      if (bodyChanged || !next.html) toRender.push(next);
      return next;
    });

    for (const issue of uniqueNew) {
      const row = { ...issue, html: '' };
      merged.push(row);
      toRender.push(row);
    }

    await attachHtml(toRender);

    const finalList = dedupeByIssueNumber(merged);
    finalList.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    await saveIssues(finalList);

    console.log(`完成。新增 ${uniqueNew.length} 条，总计 ${finalList.length} 条`);
    for (const issue of uniqueNew.slice(0, 20)) {
      console.log(`+ #${issue.issueNumber} ${issue.title}`);
    }
  } catch (error) {
    console.error('爬取失败:', error);
    process.exitCode = 1;
  }
}

main();
