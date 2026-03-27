<script setup>
import BaseForm from '../../components/BaseForm.vue'

const props = defineProps({ modelValue: { type: Object, default: () => ({}) } })
const emit = defineEmits(['submit', 'cancel'])

const fields = [
  { key: 'descripcion', label: 'Descripción', required: true },
  { key: 'total', label: 'Monto', type: 'number', step: '0.01', required: true },
  { key: 'fecha', label: 'Fecha', type: 'date', required: true },
]
</script>

<template>
  <BaseForm
    title="Gasto"
    :fields="fields"
    :model-value="props.modelValue"
    :cancelable="!!props.modelValue?.id"
    @submit="emit('submit', $event)"
    @cancel="emit('cancel')"
  />
</template>
