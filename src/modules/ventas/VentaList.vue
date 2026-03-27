<script setup>
import BaseTable from '../../components/BaseTable.vue'

defineProps({ rows: { type: Array, default: () => [] } })
defineEmits(['edit', 'delete'])

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'produccion', label: 'Producción' },
  { key: 'cantidad', label: 'Cantidad' },
  { key: 'total', label: 'Total' },
  { key: 'fecha', label: 'Fecha' },
]
</script>

<template>
  <section class="panel">
    <h3>Listado de ventas</h3>
    <BaseTable :columns="columns" :rows="rows" @edit="$emit('edit', $event)" @delete="$emit('delete', $event)" />
  </section>
</template>
