<script setup>
import BaseTable from '../../components/BaseTable.vue'

defineProps({ rows: { type: Array, default: () => [] } })
defineEmits(['edit', 'delete'])

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'total', label: 'Monto' },
  { key: 'fecha', label: 'Fecha' },
]
</script>

<template>
  <section class="panel">
    <h3>Listado de gastos</h3>
    <BaseTable :columns="columns" :rows="rows" @edit="$emit('edit', $event)" @delete="$emit('delete', $event)" />
  </section>
</template>
