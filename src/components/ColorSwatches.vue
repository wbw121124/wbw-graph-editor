<template>
  <div class="swatches">
    <button
      v-for="c in PRESETS"
      :key="c"
      class="swatch"
      :class="{ active: modelValue === c }"
      :style="{ background: c }"
      :title="c"
      @click="$emit('update:modelValue', c)"
    ></button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()

const PRESETS = ['#66bb6a', '#42a5f5', '#ffa726', '#ef5350', '#ba68c8', '#26c6da', '#ffd166', '#8d6e63']
</script>

<style scoped>
.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 0 0 2px 74px;
}

.swatch {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--border);
  padding: 0;
  cursor: pointer;
  transition: transform 0.1s;
}

.swatch:hover {
  transform: scale(1.2);
}

.swatch.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent);
}
</style>