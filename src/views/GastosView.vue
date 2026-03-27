<script setup>
import { computed, ref } from 'vue'
import { useAppStore } from '../stores/appStore'
import GastoForm from '../modules/gastos/GastoForm.vue'
import GastoList from '../modules/gastos/GastoList.vue'

const store = useAppStore()
const gastoEdicion = ref({})

const gastos = computed(() =>
  store.gastos.map((gasto) => ({
    ...gasto,
    total: `$${Number(gasto.total).toFixed(2)}`,
  })),
)

const saveGasto = (payload) => {
  if (payload.id) store.updateRecord('gastos', payload.id, payload)
  else store.createRecord('gastos', payload)
  gastoEdicion.value = {}
}
</script>

<template>
  <section class="stack">
    <h2>Gastos</h2>
    <div class="split">
      <GastoForm :model-value="gastoEdicion" @submit="saveGasto" @cancel="gastoEdicion = {}" />
      <GastoList :rows="gastos" @edit="gastoEdicion = { ...$event }" @delete="store.deleteRecord('gastos', $event.id)" />
    </div>
  </section>
</template>
