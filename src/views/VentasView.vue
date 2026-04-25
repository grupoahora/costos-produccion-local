<script setup>
import { computed, ref } from 'vue'
import BaseTable from '../components/BaseTable.vue'
import { useAppStore } from '../stores/appStore'

const store = useAppStore()
const form = ref({
  producto_id: '',
  cantidad: '',
  total: '',
  fecha: new Date().toISOString().slice(0, 10),
})
const feedback = ref('')

const productRows = computed(() =>
  store.getInventorySummary('producto').map((item) => ({
    ...item,
    saldo: item.saldo.toFixed(3),
    costo_unitario: `$${item.costo_unitario.toFixed(2)}`,
  })),
)

const validation = computed(() => {
  if (!form.value.producto_id || !(Number(form.value.cantidad) > 0)) return null
  return store.canSell(form.value.producto_id, form.value.cantidad)
})

const ventas = computed(() =>
  store.ventas.map((venta) => {
    const productoId = venta.producto_id || store.producciones.find(
      (item) => String(item.id) === String(venta.produccion_id),
    )?.producto_id

    return {
      ...venta,
      producto: store.getProductoById(productoId)?.nombre || '-',
      cantidad: Number(venta.cantidad).toFixed(2),
      total: `$${Number(venta.total).toFixed(2)}`,
    }
  }),
)

const inventoryColumns = [
  { key: 'nombre', label: 'Producto' },
  { key: 'saldo', label: 'Stock disponible' },
  { key: 'costo_unitario', label: 'Costo promedio' },
]

const saleColumns = [
  { key: 'id', label: 'ID' },
  { key: 'producto', label: 'Producto' },
  { key: 'cantidad', label: 'Cantidad' },
  { key: 'total', label: 'Total' },
  { key: 'fecha', label: 'Fecha' },
]

const saveVenta = () => {
  const result = store.registerSale(form.value)
  feedback.value = result.ok ? 'Venta registrada y stock descontado.' : result.message

  if (result.ok) {
    form.value = {
      producto_id: '',
      cantidad: '',
      total: '',
      fecha: new Date().toISOString().slice(0, 10),
    }
  }
}

const removeVenta = (row) => {
  store.deleteRecord('ventas_diarias', row.id)
}
</script>

<template>
  <section class="stack">
    <h2>Ventas</h2>

    <div class="split">
      <section class="panel">
        <h3>Nueva venta</h3>

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
            <span>Cantidad vendida</span>
            <input v-model="form.cantidad" type="number" min="0" step="1" />
          </label>

          <label>
            <span>Total</span>
            <input v-model="form.total" type="number" min="0" step="0.01" />
          </label>

          <label>
            <span>Fecha</span>
            <input v-model="form.fecha" type="date" />
          </label>
        </div>

        <div v-if="validation && !validation.ok" class="feedback error-feedback">
          {{ validation.message }}
        </div>

        <div v-else-if="validation?.ok" class="summary-strip">
          <span>Stock actual disponible</span>
          <strong>{{ Number(validation.stock_actual).toFixed(2) }}</strong>
        </div>

        <p v-if="feedback" class="feedback">{{ feedback }}</p>

        <div class="row actions">
          <button type="button" class="primary-action" @click="saveVenta">Registrar venta</button>
        </div>
      </section>

      <section class="panel">
        <h3>Stock disponible para venta</h3>
        <BaseTable :columns="inventoryColumns" :rows="productRows" :show-actions="false" />
      </section>
    </div>

    <section class="panel">
      <div class="section-heading">
        <h3>Historial de ventas</h3>
      </div>

      <div v-if="!ventas.length" class="empty-state">Aun no hay ventas registradas.</div>

      <div v-else class="production-history">
        <article v-for="row in ventas" :key="row.id" class="history-item">
          <div>
            <strong>#{{ row.id }} - {{ row.producto }}</strong>
            <p>{{ row.fecha }} | Cantidad: {{ row.cantidad }} | Total: {{ row.total }}</p>
          </div>
          <button type="button" class="danger" @click="removeVenta(row)">Eliminar</button>
        </article>
      </div>
    </section>
  </section>
</template>
