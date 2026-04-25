<script setup>
import { computed, ref, watch } from 'vue'
import BaseTable from '../components/BaseTable.vue'
import { useAppStore } from '../stores/appStore'

const store = useAppStore()
const movement = ref({
  item_tipo: 'materia_prima',
  item_id: '',
  tipo_movimiento: 'entrada',
  cantidad: '',
  fecha: new Date().toISOString().slice(0, 10),
  nota: '',
})
const movementFeedback = ref('')

const itemOptions = computed(() =>
  movement.value.item_tipo === 'producto'
    ? store.productos
    : store.materiasPrimas,
)

watch(
  () => movement.value.item_tipo,
  () => {
    movement.value.item_id = ''
  },
)

const saveMovement = () => {
  if (!movement.value.item_id || Number(movement.value.cantidad) === 0 || Number.isNaN(Number(movement.value.cantidad))) {
    movementFeedback.value = 'Completa el item y la cantidad del movimiento.'
    return
  }

  store.createRecord('inventario_movimientos', movement.value)
  movementFeedback.value = 'Movimiento registrado.'
  movement.value = {
    item_tipo: movement.value.item_tipo,
    item_id: '',
    tipo_movimiento: 'entrada',
    cantidad: '',
    fecha: new Date().toISOString().slice(0, 10),
    nota: '',
  }
}

const movimientos = computed(() =>
  store.getRecentInventoryMovements(20).map((item) => ({
    ...item,
    item: `${item.item_tipo === 'producto' ? 'Producto' : 'MP'} - ${item.item_nombre}`,
    cantidad: Number(item.cantidad_firmada).toFixed(3),
    tipo: item.tipo_movimiento,
  })),
)

const materiasRows = computed(() =>
  store.getInventorySummary('materia_prima').map((item) => ({
    ...item,
    saldo: item.saldo.toFixed(3),
    costo_unitario: `$${item.costo_unitario.toFixed(2)}`,
    valor_inventario: `$${item.valor_inventario.toFixed(2)}`,
  })),
)

const productosRows = computed(() =>
  store.getInventorySummary('producto').map((item) => ({
    ...item,
    saldo: item.saldo.toFixed(3),
    costo_unitario: `$${item.costo_unitario.toFixed(2)}`,
    valor_inventario: `$${item.valor_inventario.toFixed(2)}`,
  })),
)

const alerts = computed(() => store.getInventoryAlerts())

const summaryColumns = [
  { key: 'nombre', label: 'Item' },
  { key: 'saldo', label: 'Saldo actual' },
  { key: 'costo_unitario', label: 'Costo unitario' },
  { key: 'valor_inventario', label: 'Valor inventario' },
  { key: 'estado', label: 'Estado' },
]

const movementColumns = [
  { key: 'fecha', label: 'Fecha' },
  { key: 'item', label: 'Item' },
  { key: 'tipo', label: 'Movimiento' },
  { key: 'cantidad', label: 'Cantidad' },
  { key: 'nota', label: 'Nota' },
]
</script>

<template>
  <section class="stack">
    <h2>Inventario</h2>

    <div class="split">
      <section class="panel">
        <h3>Movimiento manual</h3>

        <div class="grid-2">
          <label>
            <span>Tipo de item</span>
            <select v-model="movement.item_tipo">
              <option value="materia_prima">Materia prima</option>
              <option value="producto">Producto terminado</option>
            </select>
          </label>

          <label>
            <span>Item</span>
            <select v-model="movement.item_id">
              <option value="">Seleccione...</option>
              <option v-for="item in itemOptions" :key="item.id" :value="item.id">
                {{ item.nombre }}
              </option>
            </select>
          </label>

          <label>
            <span>Movimiento</span>
            <select v-model="movement.tipo_movimiento">
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="ajuste">Ajuste</option>
            </select>
          </label>

          <label>
            <span>Cantidad</span>
            <input v-model="movement.cantidad" type="number" step="0.001" />
          </label>

          <label>
            <span>Fecha</span>
            <input v-model="movement.fecha" type="date" />
          </label>

          <label>
            <span>Nota</span>
            <input v-model="movement.nota" type="text" placeholder="Stock inicial, ajuste +/- , reposicion..." />
          </label>
        </div>

        <p v-if="movementFeedback" class="feedback">{{ movementFeedback }}</p>

        <div class="row actions">
          <button type="button" class="primary-action" @click="saveMovement">Registrar movimiento</button>
        </div>
      </section>

      <section class="panel">
        <h3>Alertas</h3>
        <div v-if="!alerts.length" class="empty-state">No hay alertas de inventario.</div>
        <div v-else class="alert-list">
          <article v-for="alert in alerts" :key="`${alert.item_tipo}-${alert.id}`" class="alert-item">
            <strong>{{ alert.nombre }}</strong>
            <span>{{ alert.item_tipo === 'producto' ? 'Producto' : 'Materia prima' }}</span>
            <span>Saldo: {{ alert.saldo.toFixed(3) }}</span>
          </article>
        </div>
      </section>
    </div>

    <div class="split">
      <section class="panel">
        <h3>Stock de materias primas</h3>
        <BaseTable :columns="summaryColumns" :rows="materiasRows" :show-actions="false" />
      </section>

      <section class="panel">
        <h3>Stock de productos terminados</h3>
        <BaseTable :columns="summaryColumns" :rows="productosRows" :show-actions="false" />
      </section>
    </div>

    <section class="panel">
      <h3>Movimientos recientes</h3>
      <BaseTable :columns="movementColumns" :rows="movimientos" :show-actions="false" />
    </section>
  </section>
</template>
