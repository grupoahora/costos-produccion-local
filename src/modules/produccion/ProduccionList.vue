<script setup>
import BaseTable from '../../components/BaseTable.vue'

defineProps({ rows: { type: Array, default: () => [] } })
defineEmits(['edit', 'delete'])

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'producto', label: 'Producto' },
  { key: 'cantidad', label: 'Cantidad' },
  { key: 'fecha', label: 'Fecha' },
  { key: 'costo_total', label: 'Costo total' },
  { key: 'costo_unitario', label: 'Costo unitario' },
]
</script>

<template>
  <section class="panel">
    <h3>Producciones</h3>
    <BaseTable :columns="columns" :rows="rows" @edit="$emit('edit', $event)" @delete="$emit('delete', $event)" />
  </section>
</template>
