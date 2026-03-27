<script setup>
import { computed } from 'vue'
import BaseForm from '../../components/BaseForm.vue'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  productos: { type: Array, default: () => [] },
})

const emit = defineEmits(['submit', 'cancel'])

const fields = computed(() => [
  {
    key: 'producto_id',
    label: 'Producto',
    type: 'select',
    required: true,
    options: props.productos.map((p) => ({ value: p.id, label: p.nombre })),
  },
  { key: 'cantidad', label: 'Cantidad producida', type: 'number', required: true },
  { key: 'fecha', label: 'Fecha', type: 'date', required: true },
])
</script>

<template>
  <BaseForm
    title="Alta de producción"
    :fields="fields"
    :model-value="modelValue"
    :cancelable="!!modelValue?.id"
    @submit="emit('submit', $event)"
    @cancel="emit('cancel')"
  />
</template>
