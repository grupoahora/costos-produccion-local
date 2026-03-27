<script setup>
import { computed, reactive, watch } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  fields: { type: Array, default: () => [] },
  modelValue: { type: Object, default: () => ({}) },
  submitLabel: { type: String, default: 'Guardar' },
  cancelable: { type: Boolean, default: false },
})

const emit = defineEmits(['submit', 'cancel'])
const localModel = reactive({})

watch(
  () => props.modelValue,
  (value) => {
    Object.keys(localModel).forEach((key) => delete localModel[key])
    Object.assign(localModel, value ?? {})
  },
  { immediate: true, deep: true },
)

const isEditing = computed(() => !!props.modelValue?.id)

const onSubmit = () => {
  emit('submit', { ...localModel })
}
</script>

<template>
  <form class="panel" @submit.prevent="onSubmit">
    <h3>{{ title }} <small v-if="isEditing">(edición)</small></h3>
    <div class="grid-2">
      <label v-for="field in fields" :key="field.key">
        <span>{{ field.label }}</span>
        <select
          v-if="field.type === 'select'"
          v-model="localModel[field.key]"
          :required="field.required"
        >
          <option value="">Seleccione...</option>
          <option v-for="option in field.options" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <input
          v-else
          v-model="localModel[field.key]"
          :type="field.type || 'text'"
          :required="field.required"
          :step="field.step"
        >
      </label>
    </div>
    <div class="row actions">
      <button type="submit">{{ submitLabel }}</button>
      <button v-if="cancelable" type="button" class="ghost" @click="$emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>
