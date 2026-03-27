<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'Fecha' },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <label class="date-selector">
    <span>{{ label }}</span>
    <input
      type="date"
      :value="modelValue"
      @input="emit('update:modelValue', $event.target.value)"
    >
  </label>
</template>
