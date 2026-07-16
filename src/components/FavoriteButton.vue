<template>
  <button
    type="button"
    class="fav-btn"
    :class="{ on: modelValue }"
    :disabled="disabled"
    :title="modelValue ? '取消收藏（可单独取消，不受评分影响）' : '收藏'"
    :aria-pressed="modelValue"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span class="icon" aria-hidden="true">{{ modelValue ? '♥' : '♡' }}</span>
    <span class="label">{{ modelValue ? '已收藏' : '收藏' }}</span>
  </button>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});
defineEmits(['update:modelValue']);
</script>

<style scoped>
.fav-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--border-color, #e0e0e0);
  background: #fff;
  border-radius: 4px;
  padding: 0.25rem 0.6rem;
  font-size: 0.8125rem;
  color: #666;
  cursor: pointer;
  transition: all 0.15s;
}

.fav-btn .icon {
  font-size: 1rem;
  line-height: 1;
  color: #ccc;
}

.fav-btn.on {
  border-color: #e57373;
  color: #c62828;
  background: #fff5f5;
}

.fav-btn.on .icon {
  color: #e53935;
}

.fav-btn:hover:not(:disabled) {
  border-color: #e57373;
}

.fav-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
