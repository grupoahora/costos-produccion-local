<script setup>
import { computed } from 'vue'
import BaseForm from '../../components/BaseForm.vue'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  producciones: { type: Array, default: () => [] },
  materiasPrimas: { type: Array, default: () => [] },
})

const emit = defineEmits(['submit', 'cancel'])

const fields = computed(() => [
  {
    key: 'produccion_id',
    label: 'Producción',
    type: 'select',
    required: true,
    options: props.producciones.map((p) => ({ value: p.id, label: `#${p.id} - ${p.producto}` })),
  },
  {
    key: 'materia_prima_id',
    label: 'Materia prima',
    type: 'select',
    required: true,
    options: props.materiasPrimas.map((mp) => ({ value: mp.id, label: mp.nombre })),
  },
  { key: 'cantidad', label: 'Cantidad utilizada', type: 'number', step: '0.01', required: true },
])
</script>

<template>
  <BaseForm
    title="Asociar materia prima"
    :fields="fields"
    :model-value="modelValue"
    :cancelable="!!modelValue?.id"
    @submit="emit('submit', $event)"
    @cancel="emit('cancel')"
  />
</template>
