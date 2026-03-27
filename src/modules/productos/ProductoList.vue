<script setup>
import BaseTable from '../../components/BaseTable.vue'

defineProps({ rows: { type: Array, default: () => [] }, title: { type: String, default: 'Listado' } })
defineEmits(['edit', 'delete'])

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'costo_unitario', label: 'Costo unitario' },
]
</script>

<template>
  <section class="panel">
    <h3>{{ title }}</h3>
    <BaseTable :columns="columns" :rows="rows" @edit="$emit('edit', $event)" @delete="$emit('delete', $event)" />
  </section>
</template>
