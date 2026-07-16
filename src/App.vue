<template>
  <div class="container">
    <nav class="nav-bar">
      <div class="title-section">
        <h1 class="site-title">Weekly Tools</h1>
        <div class="repo-links">
          <a
            href="https://github.com/ruanyf/weekly/issues"
            target="_blank"
            rel="noopener noreferrer"
            class="repo-link"
          >
            @ruanyf/weekly
          </a>
          <span class="divider">•</span>
          <a
            href="https://github.com/shalom-lab/weekly-tools"
            target="_blank"
            rel="noopener noreferrer"
            class="repo-link"
          >
            shalom-lab/weekly-tools
          </a>
        </div>
      </div>

      <div class="tabs" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          class="tab"
          :class="{ active: activeTab === tab.id }"
          :aria-selected="activeTab === tab.id"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="activeTab !== 'settings'" class="search-bar">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索标题或内容..."
          class="search-input"
        />
      </div>
    </nav>

    <div v-if="loadError" class="banner err">{{ loadError }}</div>
    <div v-else-if="user.syncError.value" class="banner warn">{{ user.syncError.value }}</div>
    <div v-else-if="user.syncing.value" class="banner">正在同步到仓库…</div>
    <div v-else-if="user.syncHint.value" class="banner soft">{{ user.syncHint.value }}</div>

    <SettingsPanel v-if="activeTab === 'settings'" />

    <div v-else class="main-content">
      <div class="issue-list">
        <div class="list-filters">
          <button
            v-for="opt in timeFilters"
            :key="opt.id"
            type="button"
            class="filter-chip"
            :class="{ active: timeFilter === opt.id }"
            @click="toggleTimeFilter(opt.id)"
          >
            {{ opt.label }}
          </button>
          <button
            type="button"
            class="filter-chip"
            :class="{ active: favOnly || activeTab === 'favorites' }"
            @click="toggleFavFilter"
          >
            已收藏
          </button>
        </div>

        <div class="list-content">
          <div
            v-for="issue in paginatedIssues"
            :key="issue.issueNumber"
            class="issue-item"
            :class="{
              active: selectedIssue?.issueNumber === issue.issueNumber,
              favorited: user.isFavorite(issue.issueNumber),
            }"
            @click="selectIssue(issue)"
          >
            <h3 class="issue-title">
              <span v-if="user.isFavorite(issue.issueNumber)" class="mini-heart" title="已收藏">♥</span>
              {{ issue.title }}
            </h3>
            <div class="issue-meta">
              <a
                :href="githubProfile(issue.author)"
                target="_blank"
                rel="noopener noreferrer"
                class="author-link"
                @click.stop
              >
                {{ issue.author }}
              </a>
              <span class="mini-stars" aria-hidden="true">
                {{
                  user.getRating(issue.issueNumber)
                    ? '★'.repeat(user.getRating(issue.issueNumber))
                    : ''
                }}
              </span>
              <span class="issue-date">{{ formatDate(issue.datetime) }}</span>
            </div>
          </div>
          <div v-if="!paginatedIssues.length" class="list-empty">
            {{ showFavoritesOnly ? '没有符合条件的收藏' : '没有匹配结果' }}
          </div>
        </div>

        <div class="pagination">
          <button type="button" class="page-btn" :disabled="currentPage === 1" @click="currentPage--">
            上一页
          </button>
          <span class="page-info">{{ currentPage }} / {{ totalPages || 1 }}</span>
          <button
            type="button"
            class="page-btn"
            :disabled="currentPage >= totalPages"
            @click="currentPage++"
          >
            下一页
          </button>
        </div>
      </div>

      <div v-if="selectedIssue" class="issue-detail">
        <div class="detail-header">
          <div class="detail-title">
            <h2>{{ selectedIssue.title }}</h2>
            <a
              :href="`https://github.com/ruanyf/weekly/issues/${selectedIssue.issueNumber}`"
              target="_blank"
              rel="noopener noreferrer"
              class="original-link"
            >
              #{{ selectedIssue.issueNumber }}
            </a>
          </div>
          <div class="detail-meta">
            <span class="issue-date">{{ formatDate(selectedIssue.datetime) }}</span>
            <a
              :href="githubProfile(selectedIssue.author)"
              target="_blank"
              rel="noopener noreferrer"
              class="author-link"
            >
              {{ selectedIssue.author }}
            </a>
            <FavoriteButton
              :model-value="user.isFavorite(selectedIssue.issueNumber)"
              :disabled="user.syncing.value"
              @update:model-value="onFavorite"
            />
          </div>
          <div class="detail-actions">
            <StarRating
              :model-value="user.getRating(selectedIssue.issueNumber)"
              :disabled="user.syncing.value"
              @update:model-value="onRate"
            />
          </div>
        </div>
        <div class="detail-content markdown-body" v-html="renderedBody"></div>
      </div>
      <div v-else class="empty-state">
        <div class="empty-content">
          <span class="empty-icon">📝</span>
          <p>选择一篇开始阅读</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { loadIssues } from './lib/data.js';
import { useUserData } from './lib/userData.js';
import StarRating from './components/StarRating.vue';
import FavoriteButton from './components/FavoriteButton.vue';
import SettingsPanel from './components/SettingsPanel.vue';

marked.setOptions({ breaks: true, gfm: true });

const tabs = [
  { id: 'browse', label: '浏览' },
  { id: 'favorites', label: '收藏' },
  { id: 'settings', label: '设置' },
];

const activeTab = ref('browse');
const searchQuery = ref('');
const debouncedQuery = ref('');
const selectedIssue = ref(null);
const currentPage = ref(1);
const pageSize = ref(10);
const issues = ref([]);
const loadError = ref('');
const timeFilter = ref(''); // '' | 7d | 30d | 90d | 180d
const favOnly = ref(false);
const user = useUserData();

let searchTimer = null;

const timeFilters = [
  { id: '7d', label: '近一周' },
  { id: '30d', label: '近1月' },
  { id: '90d', label: '近3月' },
  { id: '180d', label: '近半年' },
];

const showFavoritesOnly = computed(
  () => favOnly.value || activeTab.value === 'favorites'
);

function toggleTimeFilter(id) {
  timeFilter.value = timeFilter.value === id ? '' : id;
  currentPage.value = 1;
}

function toggleFavFilter() {
  if (activeTab.value === 'favorites') {
    activeTab.value = 'browse';
    favOnly.value = false;
  } else {
    favOnly.value = !favOnly.value;
  }
  currentPage.value = 1;
}

function withinTimeRange(datetime, filterId) {
  if (!filterId) return true;
  const days = { '7d': 7, '30d': 30, '90d': 90, '180d': 180 }[filterId];
  if (!days) return true;
  const t = new Date(datetime).getTime();
  if (Number.isNaN(t)) return false;
  return t >= Date.now() - days * 24 * 60 * 60 * 1000;
}

const filteredIssues = computed(() => {
  let list = issues.value;

  if (showFavoritesOnly.value) {
    list = list.filter((i) => user.isFavorite(i.issueNumber));
  }

  if (timeFilter.value) {
    list = list.filter((i) => withinTimeRange(i.datetime, timeFilter.value));
  }

  const query = debouncedQuery.value.trim().toLowerCase();
  if (!query) return list;
  return list.filter(
    (issue) =>
      issue.title.toLowerCase().includes(query) ||
      (issue.body || '').toLowerCase().includes(query)
  );
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredIssues.value.length / pageSize.value))
);

const paginatedIssues = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredIssues.value.slice(start, start + pageSize.value);
});

const renderedBody = computed(() => {
  if (!selectedIssue.value) return '';
  // 优先用抓取时保存的完整 HTML（含图片等），否则再本地渲染 markdown
  const raw =
    selectedIssue.value.html ||
    marked.parse(selectedIssue.value.body || '');
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel', 'loading', 'srcset', 'sizes'],
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'script', 'iframe'],
    FORBID_ATTR: ['style', 'onerror', 'onclick', 'onload'],
  });
});

watch(searchQuery, (val) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    debouncedQuery.value = val;
    currentPage.value = 1;
  }, 200);
});

watch(activeTab, (tab) => {
  currentPage.value = 1;
  selectedIssue.value = null;
  if (tab === 'favorites') favOnly.value = false;
});

watch([timeFilter, favOnly], () => {
  currentPage.value = 1;
});

watch(totalPages, (n) => {
  if (currentPage.value > n) currentPage.value = n;
});

function calculatePageSize() {
  const itemHeight = 78;
  const availableHeight = window.innerHeight - 260;
  pageSize.value = Math.max(5, Math.floor(availableHeight / itemHeight) - 1);
}

function githubProfile(author) {
  const login = String(author || '').replace(/[^a-zA-Z0-9-]/g, '');
  return login ? `https://github.com/${login}` : 'https://github.com';
}

function selectIssue(issue) {
  selectedIssue.value = issue;
  if (window.innerWidth <= 768) {
    setTimeout(() => {
      document.querySelector('.issue-detail')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }
}

async function onRate(stars) {
  if (!selectedIssue.value) return;
  try {
    await user.setRating(selectedIssue.value.issueNumber, stars);
  } catch {
    /* syncError already set */
  }
}

async function onFavorite(value) {
  if (!selectedIssue.value) return;
  try {
    await user.setFavorite(selectedIssue.value.issueNumber, value);
  } catch {
    /* syncError already set */
  }
}

function formatDate(datetime) {
  return new Date(datetime).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

onMounted(async () => {
  calculatePageSize();
  window.addEventListener('resize', calculatePageSize);
  try {
    const [{ issues: list }] = await Promise.all([loadIssues(), user.init()]);
    issues.value = list;
  } catch (err) {
    loadError.value = err.message || String(err);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', calculatePageSize);
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<style>
:root {
  --primary-color: #2196f3;
  --text-color: #333;
  --border-color: #e0e0e0;
  --hover-color: #f5f5f5;
  --active-color: #e3f2fd;
  --nav-height: 100px;
  --nav-height-mobile: 150px;
}

body {
  margin: 0;
  height: 100vh;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  color: var(--text-color);
}

#app {
  height: 100%;
}

.container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.nav-bar {
  z-index: 100;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  min-height: var(--nav-height);
  box-sizing: border-box;
  flex-wrap: wrap;
}

.title-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.site-title {
  margin: 0;
  font-size: 1.35rem;
  color: var(--primary-color);
}

.repo-links {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #666;
}

.repo-link {
  color: inherit;
  text-decoration: none;
}

.repo-link:hover {
  color: var(--primary-color);
}

.divider {
  color: #ccc;
}

.tabs {
  display: flex;
  gap: 0.25rem;
  background: #f3f3f3;
  padding: 3px;
  border-radius: 8px;
}

.tab {
  border: none;
  background: transparent;
  padding: 0.45rem 0.85rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #555;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.tab.active {
  background: #fff;
  color: var(--primary-color);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.search-bar {
  flex: 1;
  min-width: 180px;
  max-width: 480px;
  margin-left: auto;
}

.search-input {
  width: 100%;
  padding: 0.6rem 0.85rem;
  font-size: 0.95rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
}

.banner {
  padding: 0.4rem 1.5rem;
  font-size: 0.8rem;
  background: #e3f2fd;
  color: #1565c0;
}

.banner.warn {
  background: #fff8e1;
  color: #f57f17;
}

.banner.err {
  background: #ffebee;
  color: #c62828;
}

.banner.soft {
  background: #f5f5f5;
  color: #666;
}

.main-content {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(360px, 3fr) 6fr;
  gap: 1.5rem;
  padding: 1rem 1.5rem;
  height: calc(100vh - var(--nav-height));
}

.issue-list {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
  padding-right: 1rem;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.list-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0 0 0.75rem;
  flex-shrink: 0;
}

.filter-chip {
  border: 1px solid var(--border-color);
  background: #fff;
  color: #555;
  border-radius: 999px;
  padding: 0.28rem 0.7rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1.3;
}

.filter-chip:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.filter-chip.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: #fff;
}

.list-content {
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  min-height: 0;
}

.list-empty {
  padding: 2rem 1rem;
  text-align: center;
  color: #888;
  font-size: 0.9rem;
}

.issue-item {
  padding: 14px 12px;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: background 0.15s;
  border-radius: 6px;
  box-sizing: border-box;
  min-height: 72px;
}

.issue-item:hover {
  background-color: var(--hover-color);
}

.issue-item.favorited {
  background-color: #fff5f7;
}

.issue-item.favorited:hover {
  background-color: #ffecf0;
}

.issue-item.active {
  background-color: var(--active-color);
  border-left: 3px solid var(--primary-color);
}

.issue-item.favorited.active {
  background-color: #ffe4ea;
  border-left-color: #e57373;
}

.issue-title {
  margin: 0 0 8px 0;
  font-size: 15px;
  line-height: 22px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-heart {
  color: #e53935;
  margin-right: 0.25rem;
  font-size: 0.85rem;
}

.mini-stars {
  color: #f5a623;
  font-size: 0.75rem;
  letter-spacing: -1px;
  white-space: nowrap;
  min-height: 1em;
}

.issue-meta {
  font-size: 13px;
  line-height: 18px;
  color: #666;
  display: grid;
  grid-template-columns: minmax(6.5rem, 1fr) 4.5rem auto;
  gap: 0.5rem;
  align-items: center;
}

.author-link {
  color: inherit;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.author-link:hover {
  color: var(--primary-color);
}

.issue-date {
  color: #888;
  white-space: nowrap;
  justify-self: end;
}

.pagination {
  flex-shrink: 0;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.page-btn {
  padding: 0.45rem 0.9rem;
  border: 1px solid var(--border-color);
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.page-btn:hover:not(:disabled) {
  background: var(--primary-color);
  color: white;
}

.page-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.875rem;
  color: #666;
}

.issue-detail {
  overflow-y: auto;
  padding: 0 1rem 2rem;
}

.detail-header {
  position: sticky;
  top: 0;
  background: white;
  padding: 0.75rem 0 0.85rem;
  border-bottom: 1px solid var(--border-color);
  z-index: 2;
}

.detail-title {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.detail-title h2 {
  margin: 0;
  flex: 1;
  font-size: 1.25rem;
  line-height: 1.35;
}

.original-link {
  color: var(--primary-color);
  text-decoration: none;
  font-size: 0.85rem;
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.original-link:hover {
  text-decoration: underline;
}

.detail-meta {
  display: grid;
  grid-template-columns: auto minmax(4rem, max-content) auto;
  gap: 0.75rem 1rem;
  align-items: center;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #666;
  justify-content: start;
}

.detail-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.65rem;
  flex-wrap: wrap;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}

.empty-content {
  text-align: center;
}

.empty-icon {
  font-size: 2.5rem;
}

.markdown-body {
  line-height: 1.65;
  font-size: clamp(14px, 4vw, 16px);
  padding-top: 1rem;
}

.markdown-body img {
  max-width: 100%;
  height: auto;
}

.markdown-body a {
  color: var(--primary-color);
  text-decoration: none;
}

.markdown-body a:hover {
  text-decoration: underline;
}

.markdown-body pre {
  background: #f6f8fa;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}

.markdown-body code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
}

.markdown-body :not(pre) > code {
  background: #f5f5f5;
  padding: 0.1em 0.35em;
  border-radius: 3px;
}

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-thumb {
  background: #bbb;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .nav-bar {
    flex-direction: column;
    align-items: stretch;
    padding: 0.75rem 1rem;
    gap: 0.75rem;
  }

  .title-section {
    text-align: center;
    align-items: center;
  }

  .tabs {
    justify-content: center;
  }

  .search-bar {
    max-width: none;
    margin-left: 0;
  }

  .main-content {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    padding: 0.5rem;
    gap: 0.75rem;
    height: calc(100vh - var(--nav-height-mobile));
  }

  .issue-list {
    border-right: none;
    max-height: 38vh;
  }

  .issue-detail {
    max-height: calc(62vh - 40px);
  }
}
</style>
