<script setup>
import { computed } from 'vue'
import BaseForm from '../../components/BaseForm.vue'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  entityType: { type: String, default: 'producto' },
})
const emit = defineEmits(['submit', 'cancel'])

const isProducto = computed(() => props.entityType === 'producto')

const fields = computed(() => [
  { key: 'nombre', label: 'Nombre', required: true },
  {
    key: isProducto.value ? 'precio_venta_estimado' : 'costo_unitario',
    label: isProducto.value ? 'Precio de venta estimado' : 'Costo unitario',
    type: 'number',
    step: '0.001',
    required: true,
  },
])
</script>

<template>
  <BaseForm
    :title="isProducto ? 'Producto' : 'Materia prima'"
    :fields="fields"
    :model-value="props.modelValue"
    submit-label="Guardar"
    :cancelable="!!props.modelValue?.id"
    @submit="emit('submit', $event)"
    @cancel="emit('cancel')"
  />
</template>
