<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAppStore } from './stores/appStore'
import DashboardView from './views/DashboardView.vue'
import ProductosView from './views/ProductosView.vue'
import RecetasView from './views/RecetasView.vue'
import InventarioView from './views/InventarioView.vue'
import ProduccionView from './views/ProduccionView.vue'
import VentasView from './views/VentasView.vue'
import GastosView from './views/GastosView.vue'
import RespaldoView from './views/RespaldoView.vue'

const store = useAppStore()

const tabs = [
  { key: 'dashboard', label: 'Dashboard', component: DashboardView },
  { key: 'productos', label: 'Productos / MP', component: ProductosView },
  { key: 'recetas', label: 'Recetas', component: RecetasView },
  { key: 'inventario', label: 'Inventario', component: InventarioView },
  { key: 'produccion', label: 'Produccion', component: ProduccionView },
  { key: 'ventas', label: 'Ventas', component: VentasView },
  { key: 'gastos', label: 'Gastos', component: GastosView },
  { key: 'respaldo', label: 'Respaldo', component: RespaldoView },
]

const activeTab = ref('dashboard')

const activeComponent = computed(
  () => tabs.find((tab) => tab.key === activeTab.value)?.component || DashboardView,
)

onMounted(() => {
  store.init()
})
</script>

<template>
  <div class="app-shell">
    <header>
      <div class="title-block">
        <h1>Costos de Produccion</h1>
        <p>Inventario, recetas, produccion, ventas y tablero operativo en una sola app local.</p>
      </div>

      <nav class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>
    </header>

    <main>
      <component :is="activeComponent" />
    </main>
  </div>
</template>
