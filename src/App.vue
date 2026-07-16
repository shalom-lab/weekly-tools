<template>
  <div class="container">
    <nav class="nav-bar">
      <div class="title-section">
        <h1 class="site-title">Weekly Tools</h1>
        <div class="title-subrow">
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
          <div class="status-box" :class="statusTone" :title="statusMessage">
            <span class="status-text">{{ statusMessage || '\u00a0' }}</span>
          </div>
        </div>
      </div>

      <div class="nav-actions">
        <div v-if="!showSettings" class="search-bar">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索标题或内容..."
            class="search-input"
          />
        </div>
        <button
          type="button"
          class="sync-remote-btn"
          :class="{ primary: canSyncRemote }"
          :disabled="!canSyncRemote || user.syncing.value"
          :title="syncRemoteTitle"
          @click="onSyncRemote"
        >
          {{ user.syncing.value ? '同步中…' : '同步到远程' }}
        </button>
        <button
          type="button"
          class="icon-btn"
          :class="{ active: showSettings }"
          title="设置"
          aria-label="设置"
          @click="toggleSettings"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              fill="currentColor"
              d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.2 7.2 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.55-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.86 14.5a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.39 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.55 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"
            />
          </svg>
        </button>
        <a
          href="https://github.com/shalom-lab/weekly-tools"
          target="_blank"
          rel="noopener noreferrer"
          class="icon-btn"
          title="GitHub"
          aria-label="GitHub 仓库"
        >
          <svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
        </a>
      </div>
    </nav>

    <SettingsPanel v-if="showSettings" />

    <div v-else class="main-content">
      <div class="issue-list">
        <div class="list-filters">
          <div class="filter-group" role="group" aria-label="时间">
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
          </div>
          <div class="filter-group" role="group" aria-label="收藏">
            <button
              type="button"
              class="filter-chip"
              :class="{ active: favOnly }"
              @click="toggleFavFilter"
            >
              已收藏
            </button>
          </div>
          <div class="filter-group star-filter" role="group" :aria-label="starFilterLabel">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              class="star-filter-btn"
              :class="{ on: n <= minStars }"
              :title="`${n} 星及以上`"
              @click="toggleMinStars(n)"
            >
              ★
            </button>
          </div>
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
            <span class="fav-slot" aria-hidden="true">
              {{ user.isFavorite(issue.issueNumber) ? '♥' : '' }}
            </span>
            <div class="issue-body">
              <h3 class="issue-title">{{ issue.title }}</h3>
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
          </div>
          <div v-if="!paginatedIssues.length" class="list-empty">
            {{ favOnly ? '没有符合条件的收藏' : '没有匹配结果' }}
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
            <StarRating
              :model-value="user.getRating(selectedIssue.issueNumber)"
              :disabled="user.syncing.value"
              @update:model-value="onRate"
            />
          </div>
          <div
            v-if="user.categoriesAll.value.length"
            class="detail-categories"
            role="group"
            aria-label="分类"
          >
            <button
              v-for="cat in user.categoriesAll.value"
              :key="cat"
              type="button"
              class="cat-chip"
              :class="{ on: user.hasCategory(selectedIssue.issueNumber, cat) }"
              :disabled="user.syncing.value"
              @click="onToggleCategory(cat)"
            >
              {{ cat }}
            </button>
          </div>
          <div
            v-else
            class="detail-categories empty"
          >
            在设置中添加分类后，可在此点选打标
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
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { loadIssues } from './lib/data.js';
import { useUserData } from './lib/userData.js';
import StarRating from './components/StarRating.vue';
import FavoriteButton from './components/FavoriteButton.vue';
import SettingsPanel from './components/SettingsPanel.vue';

marked.setOptions({ breaks: true, gfm: true });

const showSettings = ref(false);
const searchQuery = ref('');
const debouncedQuery = ref('');
const selectedIssue = ref(null);
const currentPage = ref(1);
const pageSize = ref(10);
const issues = ref([]);
const loadError = ref('');
const timeFilter = ref(''); // '' | 7d | 30d | 90d | 180d
const favOnly = ref(false);
const minStars = ref(0); // 0 = 不限；>= N
const user = useUserData();

let searchTimer = null;
let listResizeObserver = null;

function calculatePageSize() {
  const contentEl = document.querySelector('.list-content');
  const listEl = document.querySelector('.issue-list');
  const filtersEl = document.querySelector('.list-filters');
  const paginationEl = document.querySelector('.pagination');

  let available = contentEl?.clientHeight || 0;
  if (available < 48 && listEl) {
    available =
      listEl.clientHeight -
      (filtersEl?.offsetHeight || 0) -
      (paginationEl?.offsetHeight || 0);
  }
  if (available < 48) {
    available = window.innerHeight - 210;
  }

  const itemEl = document.querySelector('.issue-item');
  const measured = itemEl ? itemEl.getBoundingClientRect().height : 0;
  // 略留 2px 余量，避免最后一条贴边滚动条
  const itemHeight = Math.max(64, Math.ceil(measured || 72));
  const next = Math.max(4, Math.floor((available - 2) / itemHeight));
  if (next === pageSize.value) return;

  const selectedId = selectedIssue.value?.issueNumber;
  pageSize.value = next;
  if (selectedId != null) {
    const idx = filteredIssues.value.findIndex(
      (i) => String(i.issueNumber) === String(selectedId)
    );
    if (idx >= 0) currentPage.value = Math.floor(idx / next) + 1;
  } else if (currentPage.value > Math.ceil(filteredIssues.value.length / next)) {
    currentPage.value = Math.max(1, Math.ceil(filteredIssues.value.length / next));
  }
}

const canSyncRemote = computed(() => user.pendingSync.value);

const syncRemoteTitle = computed(() => {
  if (user.syncing.value) return '正在同步…';
  if (!user.pendingSync.value) return '当前没有未同步的改动';
  if (!user.hasToken()) return '请先在设置中配置 Token';
  return '将本地改动提交到仓库';
});

const statusMessage = computed(() => {
  if (loadError.value) return loadError.value;
  if (user.syncError.value) return user.syncError.value;
  if (user.syncing.value) return '正在同步到仓库…';
  if (user.syncHint.value) return user.syncHint.value;
  return '';
});

const statusTone = computed(() => {
  if (loadError.value) return 'err';
  if (user.syncError.value) return 'warn';
  if (user.syncing.value) return 'info';
  if (user.syncHint.value) return 'soft';
  return '';
});

async function onSyncRemote() {
  if (!user.pendingSync.value || user.syncing.value) return;
  if (!user.hasToken()) {
    showSettings.value = true;
    return;
  }
  try {
    await user.syncToRepo();
  } catch {
    /* syncError already set */
  }
}

const timeFilters = [
  { id: '7d', label: '近一周' },
  { id: '30d', label: '近1月' },
  { id: '90d', label: '近3月' },
  { id: '180d', label: '近半年' },
];

function toggleSettings() {
  showSettings.value = !showSettings.value;
  if (showSettings.value) selectedIssue.value = null;
}

function toggleTimeFilter(id) {
  timeFilter.value = timeFilter.value === id ? '' : id;
  currentPage.value = 1;
}

function toggleFavFilter() {
  favOnly.value = !favOnly.value;
  currentPage.value = 1;
}

function toggleMinStars(n) {
  minStars.value = minStars.value === n ? 0 : n;
  currentPage.value = 1;
}

const starFilterLabel = computed(() =>
  minStars.value > 0 ? `${minStars.value} 星及以上` : '星级筛选'
);

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

  // 时间 ∩ 收藏 ∩ 星级
  if (timeFilter.value) {
    list = list.filter((i) => withinTimeRange(i.datetime, timeFilter.value));
  }
  if (favOnly.value) {
    list = list.filter((i) => user.isFavorite(i.issueNumber));
  }
  if (minStars.value > 0) {
    list = list.filter((i) => user.getRating(i.issueNumber) >= minStars.value);
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

watch([timeFilter, favOnly, minStars], () => {
  currentPage.value = 1;
});

watch(totalPages, (n) => {
  if (currentPage.value > n) currentPage.value = n;
});

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
  } else {
    // 桌面：确保左侧列表里的选中项可见
    requestAnimationFrame(() => {
      document
        .querySelector('.issue-item.active')
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }
}

function moveSelection(delta) {
  if (showSettings.value) return;
  const list = filteredIssues.value;
  if (!list.length) return;

  let idx = selectedIssue.value
    ? list.findIndex((i) => String(i.issueNumber) === String(selectedIssue.value.issueNumber))
    : -1;

  if (idx < 0) {
    idx = delta > 0 ? 0 : list.length - 1;
  } else {
    idx = Math.min(list.length - 1, Math.max(0, idx + delta));
  }

  const next = list[idx];
  if (!next) return;

  const page = Math.floor(idx / pageSize.value) + 1;
  if (page !== currentPage.value) currentPage.value = page;
  selectIssue(next);
}

function onKeydown(e) {
  if (showSettings.value) return;
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;

  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault();
    moveSelection(1);
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault();
    moveSelection(-1);
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

function onToggleCategory(cat) {
  if (!selectedIssue.value) return;
  user.toggleCategory(selectedIssue.value.issueNumber, cat);
}

function formatDate(datetime) {
  return new Date(datetime).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

onMounted(async () => {
  window.addEventListener('resize', calculatePageSize);
  window.addEventListener('keydown', onKeydown);
  try {
    const [{ issues: list }] = await Promise.all([loadIssues(), user.init()]);
    issues.value = list;
  } catch (err) {
    loadError.value = err.message || String(err);
  }

  await nextTick();
  calculatePageSize();
  requestAnimationFrame(() => {
    calculatePageSize();
    const listEl = document.querySelector('.issue-list');
    if (listEl && typeof ResizeObserver !== 'undefined') {
      listResizeObserver = new ResizeObserver(() => calculatePageSize());
      listResizeObserver.observe(listEl);
    }
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', calculatePageSize);
  window.removeEventListener('keydown', onKeydown);
  listResizeObserver?.disconnect();
  listResizeObserver = null;
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
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  min-height: var(--nav-height);
  box-sizing: border-box;
}

.title-section {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 0.3rem;
  flex: 1 1 auto;
  min-width: 0;
}

.site-title {
  margin: 0;
  font-size: 1.35rem;
  color: var(--primary-color);
  line-height: 1.2;
}

.title-subrow {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  min-height: 36px;
}

.repo-links {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #666;
  flex-shrink: 0;
  line-height: 1;
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

.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 0 0 auto;
  margin-left: auto;
  min-height: 36px;
}

.status-box {
  flex: 1 1 auto;
  min-width: 140px;
  max-width: 360px;
  height: 22px;
  box-sizing: border-box;
  padding: 0 0.55rem;
  border-radius: 6px;
  border: 1px solid transparent;
  background: #f7f7f7;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.status-text {
  font-size: 0.72rem;
  line-height: 1;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.status-box.info {
  background: #e3f2fd;
  border-color: #bbdefb;
}

.status-box.info .status-text {
  color: #1565c0;
}

.status-box.warn {
  background: #fff8e1;
  border-color: #ffe082;
}

.status-box.warn .status-text {
  color: #f57f17;
}

.status-box.err {
  background: #ffebee;
  border-color: #ffcdd2;
}

.status-box.err .status-text {
  color: #c62828;
}

.status-box.soft {
  background: #f0f0f0;
  border-color: #e6e6e6;
}

.status-box.soft .status-text {
  color: #666;
}

.search-bar {
  width: 280px;
  max-width: 36vw;
  min-width: 160px;
}

.search-input {
  width: 100%;
  height: 36px;
  padding: 0 0.85rem;
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

.sync-remote-btn {
  height: 36px;
  padding: 0 0.85rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #f5f5f5;
  color: #999;
  font-size: 0.85rem;
  cursor: not-allowed;
  flex-shrink: 0;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.sync-remote-btn.primary {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: #fff;
  cursor: pointer;
}

.sync-remote-btn.primary:hover:not(:disabled) {
  filter: brightness(1.05);
}

.sync-remote-btn:disabled:not(.primary) {
  opacity: 1;
}

.sync-remote-btn.primary:disabled {
  opacity: 0.7;
  cursor: wait;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #555;
  cursor: pointer;
  flex-shrink: 0;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}

.icon-btn:hover {
  background: #f0f0f0;
  color: #111;
}

.icon-btn.active {
  background: var(--active-color);
  color: var(--primary-color);
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
  align-items: center;
  gap: 0.5rem 0.75rem;
  padding: 0 0 0.75rem;
  flex-shrink: 0;
}

.filter-group {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.filter-group.star-filter {
  margin-left: auto;
}

.star-filter-btn {
  border: none;
  background: transparent;
  padding: 0 1px;
  font-size: 1rem;
  line-height: 1;
  color: #d0d0d0;
  cursor: pointer;
  transition: color 0.15s, transform 0.15s;
}

.star-filter-btn.on {
  color: #f5a623;
}

.star-filter-btn:hover {
  transform: scale(1.12);
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
  display: grid;
  grid-template-columns: 1.1rem 1fr;
  gap: 0.45rem;
  align-items: start;
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: background 0.15s;
  border-radius: 6px;
  box-sizing: border-box;
  min-height: 68px;
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

.fav-slot {
  color: #e53935;
  font-size: 0.85rem;
  line-height: 22px;
  text-align: center;
  width: 1.1rem;
}

.issue-body {
  min-width: 0;
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
  /* 只占文字宽度，名字与星星之间的空白点卡片 */
  width: fit-content;
  max-width: 100%;
  justify-self: start;
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
  grid-template-columns: auto minmax(4rem, max-content) 4.75rem auto;
  gap: 0.65rem 1rem;
  align-items: center;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #666;
  justify-content: start;
}

.detail-meta .author-link {
  width: auto;
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  justify-self: start;
}

.detail-meta :deep(.fav-btn) {
  width: 100%;
  justify-self: stretch;
}

.detail-meta :deep(.fav-btn .label) {
  display: inline-block;
  min-width: 3em;
  text-align: left;
}

.detail-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.65rem;
  min-height: 28px;
  align-items: center;
}

.detail-categories.empty {
  font-size: 0.75rem;
  color: #aaa;
}

.cat-chip {
  border: 1px solid var(--border-color);
  background: #fff;
  color: #666;
  border-radius: 999px;
  padding: 0.2rem 0.65rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1.3;
}

.cat-chip:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.cat-chip.on {
  background: #e3f2fd;
  border-color: #90caf9;
  color: #1565c0;
}

.cat-chip:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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
    text-align: left;
    align-items: stretch;
    max-width: none;
    width: 100%;
  }

  .title-subrow {
    flex-wrap: wrap;
    align-items: center;
  }

  .nav-actions {
    width: 100%;
    margin-left: 0;
    justify-content: flex-end;
  }

  .status-box {
    min-width: 0;
    flex: 1 1 12rem;
  }

  .search-bar {
    width: auto;
    max-width: none;
    flex: 1;
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
