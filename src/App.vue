<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAppStore } from './stores/appStore'
import DashboardView from './views/DashboardView.vue'
import ProductosView from './views/ProductosView.vue'
import ProduccionView from './views/ProduccionView.vue'
import VentasView from './views/VentasView.vue'
import GastosView from './views/GastosView.vue'

const store = useAppStore()

const tabs = [
  { key: 'dashboard', label: 'Dashboard diario', component: DashboardView },
  { key: 'productos', label: 'Productos / MP', component: ProductosView },
  { key: 'produccion', label: 'Producción', component: ProduccionView },
  { key: 'ventas', label: 'Ventas diarias', component: VentasView },
  { key: 'gastos', label: 'Gastos', component: GastosView },
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
      <h1>Costos de Producción</h1>
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
