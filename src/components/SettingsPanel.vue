<template>
  <div class="settings-panel">
    <h2>设置</h2>
    <p class="hint">
      BYOK：Token 存在浏览器 localStorage。可在「设置」填写，也可提前用控制台写入（见下方 key）。
      评分 / 收藏会同步到仓库的 <code>public/data/user.json</code>。
    </p>

    <div class="token-status" :class="tokenDetected ? 'ok' : 'miss'">
      {{ tokenDetected ? '已检测到本地 Token' : '未检测到本地 Token' }}
      <code>{{ tokenKey }}</code>
    </div>

    <label class="field">
      <span>GitHub Token</span>
      <div class="token-row">
        <input
          v-model="form.githubToken"
          :type="showToken ? 'text' : 'password'"
          placeholder="ghp_… 需要 contents:write"
          autocomplete="off"
        />
        <button type="button" class="ghost" @click="showToken = !showToken">
          {{ showToken ? '隐藏' : '显示' }}
        </button>
      </div>
    </label>

    <label class="field">
      <span>仓库 Owner</span>
      <input v-model="form.repoOwner" type="text" />
    </label>

    <label class="field">
      <span>仓库 Name</span>
      <input v-model="form.repoName" type="text" />
    </label>

    <label class="field">
      <span>分支</span>
      <input v-model="form.branch" type="text" />
    </label>

    <p class="path-note">同步文件固定为 <code>public/data/user.json</code></p>

    <div class="actions">
      <button type="button" class="primary" @click="save">保存设置</button>
      <button type="button" class="ghost" @click="clear">清除 Token</button>
      <button type="button" class="ghost" :disabled="syncing || !tokenDetected" @click="sync">
        {{ syncing ? '同步中…' : '立即同步到仓库' }}
      </button>
    </div>

    <p v-if="status" class="status" :class="statusType">{{ status }}</p>

    <section class="docs">
      <h3>提前写入 Token</h3>
      <pre class="code-block">localStorage.setItem('{{ tokenKey }}', 'ghp_你的Token')</pre>
      <ul>
        <li>页面启动时会先读该 key；有值即可同步，不必再在表单里填。</li>
        <li>Token 只留在本机，不会发到本站服务器。</li>
        <li>爬虫用的是环境变量 <code>GITHUB_TOKEN</code>，与前端 BYOK 分开。</li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import {
  loadSettings,
  saveSettings,
  clearToken,
  hasToken,
  TOKEN_STORAGE_KEY,
} from '../lib/settings.js';
import { useUserData } from '../lib/userData.js';

const form = reactive({
  githubToken: '',
  repoOwner: '',
  repoName: '',
  branch: '',
});

const showToken = ref(false);
const status = ref('');
const statusType = ref('ok');
const syncing = ref(false);
const tokenDetected = ref(false);
const tokenKey = TOKEN_STORAGE_KEY;
const user = useUserData();

function refreshTokenStatus() {
  tokenDetected.value = hasToken();
}

onMounted(() => {
  Object.assign(form, loadSettings());
  refreshTokenStatus();
  if (tokenDetected.value) {
    statusType.value = 'ok';
    status.value = '已从 localStorage 读取到 Token';
  }
});

function save() {
  saveSettings({ ...form });
  refreshTokenStatus();
  statusType.value = 'ok';
  status.value = tokenDetected.value
    ? `已保存（Token key: ${TOKEN_STORAGE_KEY}）`
    : '已保存其它设置（当前无 Token）';
}

function clear() {
  clearToken();
  form.githubToken = '';
  refreshTokenStatus();
  statusType.value = 'ok';
  status.value = 'Token 已清除';
}

async function sync() {
  saveSettings({ ...form });
  refreshTokenStatus();
  if (!tokenDetected.value) {
    statusType.value = 'err';
    status.value = `未检测到 Token，请先写入 ${TOKEN_STORAGE_KEY}`;
    return;
  }
  syncing.value = true;
  status.value = '';
  try {
    await user.syncToRepo();
    statusType.value = 'ok';
    status.value = '已同步 user.json';
  } catch (err) {
    statusType.value = 'err';
    status.value = err.message || String(err);
  } finally {
    syncing.value = false;
  }
}
</script>

<style scoped>
.settings-panel {
  max-width: 640px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
  overflow-y: auto;
  height: 100%;
}

h2 {
  margin: 0 0 0.5rem;
  color: var(--primary-color);
}

.hint {
  color: #666;
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 1rem;
}

.token-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  padding: 0.55rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  margin-bottom: 1.25rem;
}

.token-status.ok {
  background: #e8f5e9;
  color: #2e7d32;
}

.token-status.miss {
  background: #fff3e0;
  color: #ef6c00;
}

.token-status code {
  background: rgba(0, 0, 0, 0.06);
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  font-size: 0.8rem;
}

.path-note {
  font-size: 0.8rem;
  color: #888;
  margin: 0 0 1rem;
}

.path-note code {
  background: #f5f5f5;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: #444;
}

.field input {
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.95rem;
}

.field input:focus {
  outline: none;
  border-color: var(--primary-color);
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
  gap: 0.75rem;
  margin-top: 0.5rem;
}

button.primary {
  background: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 0.55rem 1.1rem;
  cursor: pointer;
}

button.ghost {
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0.55rem 0.9rem;
  cursor: pointer;
  color: #555;
}

button.ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status {
  margin-top: 1rem;
  font-size: 0.875rem;
}

.status.ok {
  color: #2e7d32;
}

.status.err {
  color: #c62828;
}

.docs {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.docs h3 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}

.docs ul {
  margin: 0.75rem 0 0;
  padding-left: 1.2rem;
  color: #555;
  font-size: 0.875rem;
  line-height: 1.6;
}

.docs code {
  background: #f5f5f5;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  font-size: 0.8rem;
}

.code-block {
  margin: 0;
  padding: 0.75rem 1rem;
  background: #f6f8fa;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.8rem;
  line-height: 1.5;
}
</style>
