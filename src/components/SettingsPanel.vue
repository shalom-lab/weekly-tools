<template>
  <div class="settings-panel">
    <header class="settings-hero">
      <h2>设置</h2>
      <p>Token 用于同步评分、收藏与分类；分类列表在此维护，详情页点选打标。</p>
      <div class="token-status" :class="tokenDetected ? 'ok' : 'miss'">
        {{ tokenDetected ? 'Token 已就绪' : '尚未配置 Token' }}
      </div>
    </header>

    <section class="card">
      <h3>同步</h3>
      <label class="field">
        <span>GitHub Token</span>
        <div class="token-row">
          <input
            v-model="form.githubToken"
            :type="showToken ? 'text' : 'password'"
            placeholder="Personal Access Token"
            autocomplete="off"
          />
          <button type="button" class="ghost" @click="showToken = !showToken">
            {{ showToken ? '隐藏' : '显示' }}
          </button>
        </div>
      </label>

      <div class="field-grid">
        <label class="field repo-field">
          <span>仓库</span>
          <input
            v-model="form.repo"
            type="text"
            placeholder="owner/repo"
            spellcheck="false"
          />
        </label>
        <label class="field branch-field">
          <span>Branch</span>
          <input v-model="form.branch" type="text" />
        </label>
      </div>

      <div class="actions">
        <button type="button" class="primary" @click="save">保存设置</button>
        <button type="button" class="ghost" @click="clear">清除 Token</button>
      </div>
    </section>

    <section class="card">
      <h3>分类字典</h3>
      <p class="section-hint">一行一个，顺序即展示顺序。保存后先写入本地，点顶部「同步到远程」提交仓库。</p>
      <textarea
        v-model="categoriesText"
        class="category-textarea"
        rows="8"
        placeholder="AI&#10;Web&#10;工具&#10;开源"
        spellcheck="false"
        @focus="categoriesEditing = true"
        @blur="categoriesEditing = false"
      />
      <div class="actions">
        <button type="button" class="primary" @click="saveCategories">保存分类</button>
      </div>
      <div v-if="previewTags.length" class="preview-tags">
        <span v-for="tag in previewTags" :key="tag" class="preview-tag">{{ tag }}</span>
      </div>
    </section>

    <p v-if="status" class="status" :class="statusType">{{ status }}</p>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, watch } from 'vue';
import {
  loadSettings,
  saveSettings,
  clearToken,
  hasToken,
} from '../lib/settings.js';
import { useUserData } from '../lib/userData.js';

const form = reactive({
  githubToken: '',
  repo: '',
  branch: '',
});

const showToken = ref(false);
const status = ref('');
const statusType = ref('ok');
const tokenDetected = ref(false);
const categoriesText = ref('');
const categoriesEditing = ref(false);
const user = useUserData();

const previewTags = computed(() =>
  categoriesText.value
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
);

function refreshTokenStatus() {
  tokenDetected.value = hasToken();
}

function parseRepo(raw) {
  const cleaned = String(raw || '')
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');
  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length < 2) {
    return { ok: false, error: '仓库格式应为 owner/repo' };
  }
  return {
    ok: true,
    repoOwner: parts[0],
    repoName: parts.slice(1).join('/'),
  };
}

watch(
  () => user.categoriesAll.value,
  (list) => {
    if (!categoriesEditing.value) {
      categoriesText.value = (list || []).join('\n');
    }
  },
  { immediate: true }
);

onMounted(() => {
  const s = loadSettings();
  form.githubToken = s.githubToken || '';
  form.branch = s.branch || 'main';
  form.repo = [s.repoOwner, s.repoName].filter(Boolean).join('/');
  refreshTokenStatus();
});

function save() {
  const parsed = parseRepo(form.repo);
  if (!parsed.ok) {
    statusType.value = 'err';
    status.value = parsed.error;
    return;
  }
  form.repo = `${parsed.repoOwner}/${parsed.repoName}`;
  saveSettings({
    githubToken: form.githubToken,
    repoOwner: parsed.repoOwner,
    repoName: parsed.repoName,
    branch: form.branch,
  });
  refreshTokenStatus();
  statusType.value = 'ok';
  status.value = '设置已保存';
}

function clear() {
  clearToken();
  form.githubToken = '';
  refreshTokenStatus();
  statusType.value = 'ok';
  status.value = 'Token 已清除';
}

function saveCategories() {
  user.setCategoriesAll(previewTags.value);
  categoriesText.value = previewTags.value.join('\n');
  statusType.value = 'ok';
  status.value = '分类已更新（本地）；点顶部「同步到远程」提交';
}
</script>

<style scoped>
.settings-panel {
  max-width: 680px;
  margin: 0 auto;
  padding: 1.25rem 1.25rem 3rem;
  overflow-y: auto;
  height: 100%;
  box-sizing: border-box;
}

.settings-hero {
  margin-bottom: 1.25rem;
}

.settings-hero h2 {
  margin: 0 0 0.35rem;
  color: var(--primary-color);
  font-size: 1.4rem;
}

.settings-hero p {
  margin: 0 0 0.75rem;
  color: #666;
  font-size: 0.9rem;
  line-height: 1.5;
}

.token-status {
  display: inline-flex;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  font-size: 0.8rem;
}

.token-status.ok {
  background: #e8f5e9;
  color: #2e7d32;
}

.token-status.miss {
  background: #fff3e0;
  color: #ef6c00;
}

.card {
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 1.1rem 1.15rem 1.2rem;
  margin-bottom: 1rem;
}

.card h3 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  color: #333;
}

.section-hint {
  margin: -0.25rem 0 0.75rem;
  font-size: 0.8rem;
  color: #888;
  line-height: 1.45;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
  font-size: 0.875rem;
  color: #444;
}

.field-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 7.5rem;
  gap: 0.75rem;
  align-items: start;
}

.field-grid .field {
  margin-bottom: 0.85rem;
  min-width: 0;
}

.field-grid .field input {
  width: 100%;
  box-sizing: border-box;
}

.field input,
.category-textarea {
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  font-size: 0.95rem;
  background: #fff;
  font-family: inherit;
}

.category-textarea {
  width: 100%;
  min-height: 160px;
  resize: vertical;
  line-height: 1.5;
  box-sizing: border-box;
}

.field input:focus,
.category-textarea:focus {
  outline: none;
  border-color: var(--primary-color, #2196f3);
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.12);
}

.token-row {
  display: flex;
  gap: 0.5rem;
}

.token-row input {
  flex: 1;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 0.25rem;
}

button.primary {
  background: var(--primary-color, #2196f3);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

button.ghost {
  background: #fff;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  padding: 0.5rem 0.9rem;
  cursor: pointer;
  color: #555;
}

button.ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.85rem;
}

.preview-tag {
  font-size: 0.75rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: #e3f2fd;
  color: #1565c0;
}

.status {
  margin-top: 0.5rem;
  font-size: 0.875rem;
}

.status.ok {
  color: #2e7d32;
}

.status.err {
  color: #c62828;
}

@media (max-width: 640px) {
  .field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
