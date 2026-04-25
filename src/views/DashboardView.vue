<script setup>
import { computed } from 'vue'
import BaseTable from '../components/BaseTable.vue'
import SimpleBarChart from '../components/SimpleBarChart.vue'
import SimpleTrendChart from '../components/SimpleTrendChart.vue'
import { useAppStore } from '../stores/appStore'

const store = useAppStore()

const metrics = computed(() => store.getDashboardMetrics())
const series = computed(() => store.getDashboardSeries())
const alerts = computed(() =>
  store.getInventoryAlerts().map((item) => ({
    id: `${item.item_tipo}-${item.id}`,
    item: `${item.item_tipo === 'producto' ? 'Producto' : 'MP'} - ${item.nombre}`,
    saldo: item.saldo.toFixed(3),
    estado: item.estado,
  })),
)

const alertColumns = [
  { key: 'item', label: 'Item' },
  { key: 'saldo', label: 'Saldo' },
  { key: 'estado', label: 'Estado' },
]

const trendSeries = [
  { key: 'ventas', label: 'Ventas', color: '#2563eb' },
  { key: 'gastos', label: 'Gastos', color: '#dc2626' },
  { key: 'utilidad', label: 'Utilidad', color: '#16a34a' },
]
</script>

<template>
  <section class="stack">
    <div class="panel">
      <h2>Dashboard operativo</h2>
      <div class="kpis">
        <article>
          <h4>Ventas acumuladas</h4>
          <p>${{ metrics.totalVentas.toFixed(2) }}</p>
        </article>
        <article>
          <h4>Gastos acumulados</h4>
          <p>${{ metrics.totalGastos.toFixed(2) }}</p>
        </article>
        <article>
          <h4>Utilidad acumulada</h4>
          <p>${{ metrics.totalUtilidad.toFixed(2) }}</p>
        </article>
        <article>
          <h4>Unidades producidas</h4>
          <p>{{ metrics.totalProducido.toFixed(2) }}</p>
        </article>
        <article>
          <h4>Valor inventario</h4>
          <p>${{ metrics.valorInventario.toFixed(2) }}</p>
        </article>
        <article>
          <h4>Alertas de stock</h4>
          <p>{{ metrics.alertasInventario }}</p>
        </article>
      </div>
    </div>

    <SimpleTrendChart
      title="Ventas, gastos y utilidad por fecha"
      :points="series.utilidadDiaria"
      :series="trendSeries"
    />

    <div class="split">
      <SimpleBarChart
        title="Produccion por producto"
        :items="series.produccionPorProducto"
        empty-text="Registra producciones para ver el grafico."
      />

      <SimpleBarChart
        title="Materias primas mas consumidas"
        :items="series.consumoMateriaPrima"
        empty-text="Aun no hay consumo de materias primas."
      />
    </div>

    <div class="split">
      <SimpleBarChart
        title="Stock critico"
        :items="series.inventarioCritico"
        empty-text="No hay items criticos."
      />

      <section class="panel">
        <h3>Alertas activas</h3>
        <BaseTable :columns="alertColumns" :rows="alerts" :show-actions="false" empty-text="No hay alertas activas." />
      </section>
    </div>
  </section>
</template>
