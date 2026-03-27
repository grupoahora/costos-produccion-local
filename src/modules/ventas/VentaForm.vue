<script setup>
import { computed } from 'vue'
import BaseForm from '../../components/BaseForm.vue'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  producciones: { type: Array, default: () => [] },
})

const emit = defineEmits(['submit', 'cancel'])

const fields = computed(() => [
  {
    key: 'produccion_id',
    label: 'Producción vendida',
    type: 'select',
    required: true,
    options: props.producciones.map((p) => ({ value: p.id, label: `#${p.id} - ${p.producto}` })),
  },
  { key: 'cantidad', label: 'Cantidad vendida', type: 'number', required: true },
  { key: 'total', label: 'Importe total', type: 'number', step: '0.01', required: true },
  { key: 'fecha', label: 'Fecha', type: 'date', required: true },
])
</script>

<template>
  <BaseForm
    title="Venta diaria"
    :fields="fields"
    :model-value="modelValue"
    :cancelable="!!modelValue?.id"
    @submit="emit('submit', $event)"
    @cancel="emit('cancel')"
  />
</template>
