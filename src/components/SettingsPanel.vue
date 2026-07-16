<template>
  <div class="settings-panel">
    <h2>设置</h2>
    <p class="hint">配置后可将评分、收藏同步到本仓库。</p>

    <div class="token-status" :class="tokenDetected ? 'ok' : 'miss'">
      {{ tokenDetected ? '已配置 Token' : '未配置 Token' }}
    </div>

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

    <div class="actions">
      <button type="button" class="primary" @click="save">保存</button>
      <button type="button" class="ghost" @click="clear">清除 Token</button>
      <button type="button" class="ghost" :disabled="syncing || !tokenDetected" @click="sync">
        {{ syncing ? '同步中…' : '同步' }}
      </button>
    </div>

    <p v-if="status" class="status" :class="statusType">{{ status }}</p>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import {
  loadSettings,
  saveSettings,
  clearToken,
  hasToken,
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
const user = useUserData();

function refreshTokenStatus() {
  tokenDetected.value = hasToken();
}

onMounted(() => {
  Object.assign(form, loadSettings());
  refreshTokenStatus();
});

function save() {
  saveSettings({ ...form });
  refreshTokenStatus();
  statusType.value = 'ok';
  status.value = '已保存';
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
    status.value = '请先配置 Token';
    return;
  }
  syncing.value = true;
  status.value = '';
  try {
    await user.syncToRepo();
    statusType.value = 'ok';
    status.value = '同步完成';
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
  max-width: 520px;
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
  padding: 0.5rem 0.75rem;
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
</style>
