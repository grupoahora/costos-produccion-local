<script setup>
import { computed, ref } from 'vue'
import BaseTable from '../components/BaseTable.vue'
import { useAppStore } from '../stores/appStore'

const store = useAppStore()
const form = ref({
  producto_id: '',
  cantidad: '',
  fecha: new Date().toISOString().slice(0, 10),
})
const feedback = ref('')

const requirements = computed(() => {
  if (!form.value.producto_id || !(Number(form.value.cantidad) > 0)) return null
  return store.getRecipeRequirements(form.value.producto_id, form.value.cantidad)
})

const requirementsRows = computed(() => {
  if (!requirements.value?.ok) return []
  return requirements.value.detalles.map((item) => ({
    id: item.materia_prima_id,
    materia_prima: item.materia_prima_nombre,
    requerido: item.cantidad_requerida.toFixed(3),
    stock_actual: item.stock_actual.toFixed(3),
    costo_unitario: `$${item.costo_unitario.toFixed(2)}`,
    costo_total: `$${item.costo_total.toFixed(2)}`,
    estado: item.stock_suficiente ? 'OK' : 'Faltante',
  }))
})

const producciones = computed(() =>
  store.getProduccionesConCostos().map((produccion) => ({
    ...produccion,
    cantidad: Number(produccion.cantidad).toFixed(2),
    costo_total: `$${produccion.costo_total.toFixed(2)}`,
    costo_unitario: `$${produccion.costo_unitario.toFixed(2)}`,
  })),
)

const columnsRequirements = [
  { key: 'materia_prima', label: 'Materia prima' },
  { key: 'requerido', label: 'Requerido' },
  { key: 'stock_actual', label: 'Stock actual' },
  { key: 'costo_unitario', label: 'Costo unitario' },
  { key: 'costo_total', label: 'Costo total' },
  { key: 'estado', label: 'Estado' },
]

const columnsProduccion = [
  { key: 'id', label: 'ID' },
  { key: 'producto_nombre', label: 'Producto' },
  { key: 'cantidad', label: 'Cantidad' },
  { key: 'fecha', label: 'Fecha' },
  { key: 'receta_nombre', label: 'Receta' },
  { key: 'costo_total', label: 'Costo total' },
  { key: 'costo_unitario', label: 'Costo unitario' },
]

const saveProduccion = () => {
  const result = store.registerProduction(form.value)
  feedback.value = result.ok ? 'Produccion registrada y stock actualizado.' : result.message

  if (result.ok) {
    form.value = {
      producto_id: '',
      cantidad: '',
      fecha: new Date().toISOString().slice(0, 10),
    }
  }
}

const removeProduccion = (row) => {
  store.deleteRecord('producciones', row.id)
}
</script>

<template>
  <section class="stack">
    <h2>Produccion integrada con receta</h2>

    <div class="split">
      <section class="panel">
        <h3>Nueva produccion</h3>

        <div class="grid-2">
          <label>
            <span>Producto</span>
            <select v-model="form.producto_id">
              <option value="">Seleccione...</option>
              <option v-for="producto in store.productos" :key="producto.id" :value="producto.id">
                {{ producto.nombre }}
              </option>
            </select>
          </label>

          <label>
            <span>Cantidad a producir</span>
            <input v-model="form.cantidad" type="number" min="0" step="1" />
          </label>

          <label>
            <span>Fecha</span>
            <input v-model="form.fecha" type="date" />
          </label>
        </div>

        <div v-if="requirements && !requirements.ok" class="feedback error-feedback">
          {{ requirements.message }}
        </div>

        <div v-else-if="requirements?.ok" class="summary-strip">
          <span>Receta: {{ requirements.receta.nombre }}</span>
          <strong>Costo estimado: ${{ requirements.costo_total.toFixed(2) }}</strong>
        </div>

        <p v-if="feedback" class="feedback">{{ feedback }}</p>

        <div class="row actions">
          <button type="button" class="primary-action" @click="saveProduccion">Registrar produccion</button>
        </div>
      </section>

      <section class="panel">
        <h3>Consumo esperado</h3>
        <BaseTable
          :columns="columnsRequirements"
          :rows="requirementsRows"
          :show-actions="false"
          empty-text="Selecciona un producto con receta y una cantidad."
        />
      </section>
    </div>

    <section class="panel">
      <div class="section-heading">
        <h3>Historial de produccion</h3>
      </div>

      <div v-if="!producciones.length" class="empty-state">Aun no hay producciones registradas.</div>

      <div v-else class="production-history">
        <article v-for="row in producciones" :key="row.id" class="history-item">
          <div>
            <strong>#{{ row.id }} - {{ row.producto_nombre }}</strong>
            <p>{{ row.fecha }} | Cantidad: {{ row.cantidad }} | {{ row.receta_nombre }}</p>
            <p>Costo total {{ row.costo_total }} | Unitario {{ row.costo_unitario }}</p>
          </div>
          <button type="button" class="danger" @click="removeProduccion(row)">Eliminar</button>
        </article>
      </div>
    </section>
  </section>
</template>
