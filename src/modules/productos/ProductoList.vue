<script setup>
import { computed } from 'vue'
import BaseTable from '../../components/BaseTable.vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  title: { type: String, default: 'Listado' },
  entityType: { type: String, default: 'producto' },
})
defineEmits(['edit', 'delete'])

const columns = computed(() => [
  { key: 'id', label: 'ID' },
  { key: 'nombre', label: 'Nombre' },
  {
    key: props.entityType === 'producto' ? 'precio_venta_estimado' : 'costo_unitario',
    label: props.entityType === 'producto' ? 'Precio de venta estimado' : 'Costo unitario',
  },
])
</script>

<template>
  <section class="panel">
    <h3>{{ title }}</h3>
    <BaseTable :columns="columns" :rows="rows" @edit="$emit('edit', $event)" @delete="$emit('delete', $event)" />
  </section>
</template>
