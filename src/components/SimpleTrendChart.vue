<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  points: { type: Array, default: () => [] },
  series: { type: Array, default: () => [] },
  emptyText: { type: String, default: 'Sin datos para graficar.' },
})

const width = 640
const height = 240
const padding = 24

const allValues = computed(() => {
  const values = []
  props.points.forEach((point) => {
    props.series.forEach((serie) => {
      values.push(Number(point[serie.key] || 0))
    })
  })
  return values.length ? values : [0]
})

const maxValue = computed(() => Math.max(1, ...allValues.value))

const getX = (index) => {
  if (props.points.length <= 1) return padding
  return padding + (index * (width - padding * 2)) / (props.points.length - 1)
}

const getY = (value) =>
  height - padding - (Number(value || 0) / maxValue.value) * (height - padding * 2)

const polyline = (serie) =>
  props.points.map((point, index) => `${getX(index)},${getY(point[serie.key])}`).join(' ')
</script>

<template>
  <section class="panel chart-panel">
    <div class="section-heading">
      <h3>{{ title }}</h3>
      <div class="chart-legend">
        <span v-for="serie in series" :key="serie.key" class="legend-item">
          <i :style="{ background: serie.color }"></i>
          {{ serie.label }}
        </span>
      </div>
    </div>

    <div v-if="!points.length" class="empty-state">{{ emptyText }}</div>

    <div v-else class="trend-chart">
      <svg :viewBox="`0 0 ${width} ${height}`" role="img" aria-label="Grafico de tendencia">
        <line
          :x1="padding"
          :y1="height - padding"
          :x2="width - padding"
          :y2="height - padding"
          stroke="#cbd5e1"
          stroke-width="1"
        />
        <line
          :x1="padding"
          :y1="padding"
          :x2="padding"
          :y2="height - padding"
          stroke="#cbd5e1"
          stroke-width="1"
        />

        <polyline
          v-for="serie in series"
          :key="serie.key"
          :points="polyline(serie)"
          fill="none"
          :stroke="serie.color"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <g v-for="(point, index) in points" :key="point.fecha">
          <circle
            v-for="serie in series"
            :key="`${point.fecha}-${serie.key}`"
            :cx="getX(index)"
            :cy="getY(point[serie.key])"
            r="3.5"
            :fill="serie.color"
          />
          <text
            :x="getX(index)"
            :y="height - 8"
            text-anchor="middle"
            fill="#64748b"
            font-size="10"
          >
            {{ point.fecha.slice(5) }}
          </text>
        </g>
      </svg>
    </div>
  </section>
</template>
