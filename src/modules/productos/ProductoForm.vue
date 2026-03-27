<script setup>
import BaseForm from '../../components/BaseForm.vue'

const props = defineProps({ modelValue: { type: Object, default: () => ({}) } })
const emit = defineEmits(['submit', 'cancel'])

const fields = [
  { key: 'nombre', label: 'Nombre', required: true },
  { key: 'costo_unitario', label: 'Costo unitario', type: 'number', step: '0.01', required: true },
]
</script>

<template>
  <BaseForm
    title="Producto / Materia prima"
    :fields="fields"
    :model-value="props.modelValue"
    submit-label="Guardar"
    :cancelable="!!props.modelValue?.id"
    @submit="emit('submit', $event)"
    @cancel="emit('cancel')"
  />
</template>
