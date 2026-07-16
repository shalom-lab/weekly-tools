<template>
  <div class="star-rating" :class="{ readonly }" role="group" :aria-label="`评分 ${modelValue} / 5`">
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      class="star-btn"
      :class="{ on: n <= modelValue }"
      :disabled="readonly || disabled"
      :title="`${n} 星`"
      @click="set(n)"
    >
      ★
    </button>
    <button
      v-if="modelValue > 0 && !readonly"
      type="button"
      class="clear-btn"
      :disabled="disabled"
      title="清除评分"
      @click="set(0)"
    >
      清除
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Number, default: 0 },
  readonly: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);

function set(n) {
  if (props.readonly || props.disabled) return;
  // 再次点击同一星 → 取消？用户要 5 星制，点当前星保持；用清除按钮清零
  emit('update:modelValue', n);
}
</script>

<style scoped>
.star-rating {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.star-btn {
  border: none;
  background: transparent;
  padding: 0 1px;
  font-size: 1.1rem;
  line-height: 1;
  color: #d0d0d0;
  cursor: pointer;
  transition: color 0.15s, transform 0.15s;
}

.star-btn.on {
  color: #f5a623;
}

.star-btn:hover:not(:disabled) {
  transform: scale(1.15);
}

.star-btn:disabled {
  cursor: default;
}

.clear-btn {
  margin-left: 0.35rem;
  border: none;
  background: transparent;
  color: #888;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0 0.25rem;
}

.clear-btn:hover:not(:disabled) {
  color: var(--primary-color, #2196f3);
}
</style>
