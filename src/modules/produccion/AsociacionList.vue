<script setup>
import BaseTable from '../../components/BaseTable.vue'

defineProps({ rows: { type: Array, default: () => [] } })
defineEmits(['edit', 'delete'])

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'produccion', label: 'Producción' },
  { key: 'materia_prima', label: 'Materia prima' },
  { key: 'cantidad', label: 'Cantidad' },
]
</script>

<template>
  <section class="panel">
    <h3>Materia prima por producción</h3>
    <BaseTable :columns="columns" :rows="rows" @edit="$emit('edit', $event)" @delete="$emit('delete', $event)" />
  </section>
</template>
