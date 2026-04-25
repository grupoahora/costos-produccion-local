<script setup>
import { computed, reactive, ref, watch } from 'vue'
import BaseTable from '../components/BaseTable.vue'
import { useAppStore } from '../stores/appStore'

const store = useAppStore()
const selectedProductId = ref('')
const recipeName = ref('')
const detailDraft = reactive({
  materia_prima_id: '',
  cantidad: '',
})
const details = ref([])
const feedback = ref('')

const productOptions = computed(() =>
  store.productos.map((item) => ({ value: String(item.id), label: item.nombre })),
)

const materiaOptions = computed(() =>
  store.materiasPrimas.map((item) => ({ value: String(item.id), label: item.nombre })),
)

const recetasRows = computed(() =>
  store.productos.map((producto) => {
    const receta = store.getRecipeByProduct(producto.id)
    return {
      id: producto.id,
      producto: producto.nombre,
      receta: receta?.nombre || 'Sin receta',
      insumos: receta?.detalles.length || 0,
      costo_estimado: receta ? `$${receta.costo_estimado.toFixed(2)}` : '$0.00',
      actualizada: receta?.fecha_actualizacion || '-',
    }
  }),
)

const detailRows = computed(() =>
  details.value.map((detalle, index) => ({
    id: index + 1,
    materia_prima: store.getMateriaPrimaById(detalle.materia_prima_id)?.nombre || '-',
    cantidad: Number(detalle.cantidad).toFixed(3),
    costo_unitario: `$${Number(detalle.costo_unitario || 0).toFixed(2)}`,
    costo_total: `$${Number(detalle.costo_total || 0).toFixed(2)}`,
  })),
)

const recipeColumns = [
  { key: 'producto', label: 'Producto' },
  { key: 'receta', label: 'Receta activa' },
  { key: 'insumos', label: 'Insumos' },
  { key: 'costo_estimado', label: 'Costo estimado' },
  { key: 'actualizada', label: 'Actualizada' },
]

const detailColumns = [
  { key: 'materia_prima', label: 'Materia prima' },
  { key: 'cantidad', label: 'Cantidad por unidad' },
  { key: 'costo_unitario', label: 'Costo unitario' },
  { key: 'costo_total', label: 'Costo total' },
]

const resetDraft = () => {
  detailDraft.materia_prima_id = ''
  detailDraft.cantidad = ''
}

const loadRecipe = (productId) => {
  selectedProductId.value = String(productId || '')
  const recipe = store.getRecipeByProduct(productId)
  recipeName.value = recipe?.nombre || ''
  details.value = recipe?.detalles.map((detalle) => ({
    materia_prima_id: String(detalle.materia_prima_id),
    cantidad: Number(detalle.cantidad),
    costo_unitario: Number(detalle.costo_unitario),
    costo_total: Number(detalle.costo_total),
  })) || []
  feedback.value = ''
  resetDraft()
}

watch(
  () => selectedProductId.value,
  (productId) => {
    if (!productId) {
      recipeName.value = ''
      details.value = []
      return
    }
    loadRecipe(productId)
  },
)

const addDetail = () => {
  const materiaPrima = store.getMateriaPrimaById(detailDraft.materia_prima_id)
  const cantidad = Number(detailDraft.cantidad)

  if (!materiaPrima || !(cantidad > 0)) {
    feedback.value = 'Selecciona una materia prima y una cantidad valida.'
    return
  }

  const existingIndex = details.value.findIndex(
    (detalle) => String(detalle.materia_prima_id) === String(detailDraft.materia_prima_id),
  )

  const nextDetail = {
    materia_prima_id: String(detailDraft.materia_prima_id),
    cantidad,
    costo_unitario: Number(materiaPrima.costo_unitario || 0),
    costo_total: cantidad * Number(materiaPrima.costo_unitario || 0),
  }

  if (existingIndex >= 0) {
    details.value.splice(existingIndex, 1, nextDetail)
  } else {
    details.value.push(nextDetail)
  }

  feedback.value = ''
  resetDraft()
}

const removeDetail = (index) => {
  details.value.splice(index, 1)
}

const saveRecipe = () => {
  const result = store.saveRecipeForProduct({
    producto_id: selectedProductId.value,
    nombre: recipeName.value,
    detalles: details.value,
  })

  feedback.value = result.ok ? 'Receta guardada correctamente.' : result.message
  if (result.ok) {
    loadRecipe(selectedProductId.value)
  }
}

const deleteRecipe = () => {
  if (!selectedProductId.value) return
  store.deleteRecipeByProduct(selectedProductId.value)
  feedback.value = 'Receta eliminada.'
  loadRecipe(selectedProductId.value)
}

const costoTotal = computed(() =>
  details.value.reduce((total, item) => total + Number(item.costo_total || 0), 0),
)
</script>

<template>
  <section class="stack">
    <h2>Recetas por producto</h2>

    <div class="split">
      <section class="panel">
        <h3>Receta activa</h3>

        <label>
          <span>Producto</span>
          <select v-model="selectedProductId">
            <option value="">Seleccione...</option>
            <option v-for="option in productOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label>
          <span>Nombre de receta</span>
          <input v-model="recipeName" type="text" placeholder="Receta principal" />
        </label>

        <div class="inline-form">
          <label>
            <span>Materia prima</span>
            <select v-model="detailDraft.materia_prima_id">
              <option value="">Seleccione...</option>
              <option v-for="option in materiaOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label>
            <span>Cantidad por unidad</span>
            <input v-model="detailDraft.cantidad" type="number" step="0.001" min="0" />
          </label>

          <button type="button" class="primary-action" @click="addDetail">Agregar insumo</button>
        </div>

        <div class="panel nested-panel">
          <div class="section-heading">
            <h4>Detalle</h4>
            <strong>${{ costoTotal.toFixed(2) }}</strong>
          </div>

          <div v-if="!details.length" class="empty-state">Agrega al menos un insumo a la receta.</div>

          <div v-else class="detail-list">
            <article v-for="(detalle, index) in details" :key="`${detalle.materia_prima_id}-${index}`" class="detail-item">
              <div>
                <strong>{{ store.getMateriaPrimaById(detalle.materia_prima_id)?.nombre || '-' }}</strong>
                <p>{{ Number(detalle.cantidad).toFixed(3) }} x ${{ Number(detalle.costo_unitario).toFixed(2) }}</p>
              </div>
              <div class="row actions">
                <strong>${{ Number(detalle.costo_total).toFixed(2) }}</strong>
                <button type="button" class="danger" @click="removeDetail(index)">Quitar</button>
              </div>
            </article>
          </div>
        </div>

        <p v-if="feedback" class="feedback">{{ feedback }}</p>

        <div class="row actions">
          <button type="button" class="primary-action" @click="saveRecipe">Guardar receta</button>
          <button type="button" class="ghost" @click="deleteRecipe" :disabled="!selectedProductId">Eliminar receta</button>
        </div>
      </section>

      <section class="panel">
        <h3>Resumen de recetas</h3>
        <BaseTable :columns="recipeColumns" :rows="recetasRows" :show-actions="false" />
      </section>
    </div>

    <section class="panel">
      <h3>Vista previa de la receta seleccionada</h3>
      <BaseTable :columns="detailColumns" :rows="detailRows" :show-actions="false" empty-text="Selecciona un producto con receta." />
    </section>
  </section>
</template>
