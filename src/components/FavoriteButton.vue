<template>
  <button
    type="button"
    class="fav-btn"
    :class="{ on: modelValue }"
    :disabled="disabled"
    :title="modelValue ? '取消收藏' : '收藏'"
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
  gap: 0.3rem;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 0.8125rem;
  color: #888;
  cursor: pointer;
  transition: color 0.15s;
  line-height: 1;
  justify-self: start;
}

.fav-btn .icon {
  font-size: 0.95rem;
  line-height: 1;
  color: #ccc;
}

.fav-btn.on {
  color: #c62828;
}

.fav-btn.on .icon {
  color: #e53935;
}

.fav-btn:hover:not(:disabled) {
  color: #e53935;
}

.fav-btn:hover:not(:disabled) .icon {
  color: #e53935;
}

.fav-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
