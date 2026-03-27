<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/appStore'
import DateSelector from '../components/DateSelector.vue'

const store = useAppStore()
const { ventas, gastos } = storeToRefs(store)
const fecha = ref(new Date().toISOString().slice(0, 10))

const resumen = computed(() => {
  const data = store.getUtilidadDiaria({ incluirCostoProduccionVendido: true })
  return data.find((item) => item.fecha === fecha.value) || {
    fecha: fecha.value,
    ventas: 0,
    gastos: 0,
    costo_produccion_vendido: 0,
    utilidad: 0,
  }
})

const totales = computed(() => ({
  ventas: ventas.value.reduce((acc, item) => acc + Number(item.total || 0), 0),
  gastos: gastos.value.reduce((acc, item) => acc + Number(item.total || 0), 0),
  producciones: store.producciones.length,
}))
</script>

<template>
  <section class="stack">
    <div class="panel">
      <h2>Dashboard diario</h2>
      <DateSelector v-model="fecha" label="Fecha de análisis" />
      <div class="kpis">
        <article><h4>Ventas</h4><p>${{ resumen.ventas.toFixed(2) }}</p></article>
        <article><h4>Gastos</h4><p>${{ resumen.gastos.toFixed(2) }}</p></article>
        <article><h4>Costo producción vendido</h4><p>${{ resumen.costo_produccion_vendido.toFixed(2) }}</p></article>
        <article><h4>Utilidad</h4><p>${{ resumen.utilidad.toFixed(2) }}</p></article>
      </div>
    </div>

    <div class="panel">
      <h3>Totales acumulados</h3>
      <ul>
        <li>Ventas acumuladas: ${{ totales.ventas.toFixed(2) }}</li>
        <li>Gastos acumulados: ${{ totales.gastos.toFixed(2) }}</li>
        <li>Registros de producción: {{ totales.producciones }}</li>
      </ul>
    </div>
  </section>
</template>
