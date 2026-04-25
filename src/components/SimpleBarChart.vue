<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  items: { type: Array, default: () => [] },
  valuePrefix: { type: String, default: '' },
  emptyText: { type: String, default: 'Sin datos para graficar.' },
})

const maxValue = computed(() =>
  Math.max(1, ...props.items.map((item) => Number(item.value || 0))),
)

const bars = computed(() =>
  props.items.map((item) => ({
    ...item,
    width: `${(Number(item.value || 0) / maxValue.value) * 100}%`,
  })),
)
</script>

<template>
  <section class="panel chart-panel">
    <div class="section-heading">
      <h3>{{ title }}</h3>
    </div>

    <div v-if="!bars.length" class="empty-state">{{ emptyText }}</div>

    <div v-else class="bar-chart">
      <div v-for="item in bars" :key="item.label" class="bar-row">
        <div class="bar-meta">
          <span>{{ item.label }}</span>
          <strong>{{ valuePrefix }}{{ Number(item.value || 0).toFixed(2) }}</strong>
        </div>
        <div class="bar-track">
          <div class="bar-fill" :style="{ width: item.width }"></div>
        </div>
      </div>
    </div>
  </section>
</template>
