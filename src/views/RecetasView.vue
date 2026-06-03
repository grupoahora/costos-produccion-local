<script setup>
import { computed, reactive, ref, watch } from 'vue'
import BaseTable from '../components/BaseTable.vue'
import { useAppStore } from '../stores/appStore'

const store = useAppStore()
const selectedProductId = ref('')
const recipeName = ref('')
const detailDraft = reactive({
  materia_prima_id: '',
  tipo: 'principal',
  valor: '',
})
const details = ref([])
const feedback = ref('')

const productOptions = computed(() =>
  store.productos.map((item) => ({ value: String(item.id), label: item.nombre })),
)

const materiaOptions = computed(() =>
  store.materiasPrimas.map((item) => ({ value: String(item.id), label: item.nombre })),
)

const principalDetail = computed(() => details.value.find((detalle) => detalle.es_principal) || null)

const hydratedDetails = computed(() => {
  const principalGramos = Number(principalDetail.value?.gramos_base || 0)

  return details.value.map((detalle) => {
    const materiaPrima = store.getMateriaPrimaById(detalle.materia_prima_id)
    const costoUnitario = Number(materiaPrima?.costo_unitario || 0)
    const gramosCalculados = detalle.es_principal
      ? Number(detalle.gramos_base || 0)
      : (principalGramos * Number(detalle.porcentaje_principal || 0)) / 100

    return {
      ...detalle,
      materia_prima: materiaPrima?.nombre || '-',
      gramos_calculados: gramosCalculados,
      costo_unitario: costoUnitario,
      costo_total: gramosCalculados * costoUnitario,
      relacion: detalle.es_principal
        ? `${Number(detalle.gramos_base || 0).toFixed(3)} g`
        : `${Number(detalle.porcentaje_principal || 0).toFixed(2)}% del principal`,
    }
  })
})

const recetasRows = computed(() =>
  store.productos.map((producto) => {
    const receta = store.getRecipeByProduct(producto.id)
    const principal = receta?.detalles.find((detalle) => detalle.es_principal)

    return {
      id: producto.id,
      producto: producto.nombre,
      receta: receta?.nombre || 'Sin receta',
      principal: principal
        ? `${principal.materia_prima_nombre} (${Number(principal.gramos_base || principal.cantidad_base || 0).toFixed(3)} g)`
        : '-',
      insumos: receta?.detalles.length || 0,
      costo_estimado: receta ? `$${receta.costo_estimado.toFixed(2)}` : '$0.00',
      actualizada: receta?.fecha_actualizacion || '-',
    }
  }),
)

const detailRows = computed(() =>
  hydratedDetails.value.map((detalle, index) => ({
    id: index + 1,
    materia_prima: detalle.materia_prima,
    tipo: detalle.es_principal ? 'Principal' : 'Porcentaje',
    relacion: detalle.relacion,
    gramos_calculados: `${detalle.gramos_calculados.toFixed(3)} g`,
    costo_unitario: `$${detalle.costo_unitario.toFixed(2)}`,
    costo_total: `$${detalle.costo_total.toFixed(2)}`,
  })),
)

const recipeColumns = [
  { key: 'producto', label: 'Producto' },
  { key: 'receta', label: 'Receta activa' },
  { key: 'principal', label: 'Ingrediente principal' },
  { key: 'insumos', label: 'Insumos' },
  { key: 'costo_estimado', label: 'Costo estimado' },
  { key: 'actualizada', label: 'Actualizada' },
]

const detailColumns = [
  { key: 'materia_prima', label: 'Materia prima' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'relacion', label: 'Relacion' },
  { key: 'gramos_calculados', label: 'Gramos calculados' },
  { key: 'costo_unitario', label: 'Costo unitario' },
  { key: 'costo_total', label: 'Costo total' },
]

const resetDraft = () => {
  detailDraft.materia_prima_id = ''
  detailDraft.tipo = principalDetail.value ? 'porcentaje' : 'principal'
  detailDraft.valor = ''
}

const loadRecipe = (productId) => {
  selectedProductId.value = String(productId || '')
  const recipe = store.getRecipeByProduct(productId)
  recipeName.value = recipe?.nombre || ''
  details.value = recipe?.detalles.map((detalle) => ({
    materia_prima_id: String(detalle.materia_prima_id),
    es_principal: detalle.es_principal === true,
    gramos_base: Number(detalle.gramos_base || detalle.cantidad_base || 0),
    porcentaje_principal: detalle.es_principal ? 0 : Number(detalle.porcentaje_principal || 0),
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
      resetDraft()
      return
    }
    loadRecipe(productId)
  },
)

const addDetail = () => {
  const materiaPrima = store.getMateriaPrimaById(detailDraft.materia_prima_id)
  const valor = Number(detailDraft.valor)
  const isPrincipal = detailDraft.tipo === 'principal'

  if (!materiaPrima || !(valor > 0)) {
    feedback.value = 'Selecciona una materia prima y un valor valido.'
    return
  }

  if (isPrincipal && principalDetail.value && String(principalDetail.value.materia_prima_id) !== String(detailDraft.materia_prima_id)) {
    feedback.value = 'Solo puede existir un ingrediente principal. Quita o reemplaza el actual.'
    return
  }

  const existingIndex = details.value.findIndex(
    (detalle) => String(detalle.materia_prima_id) === String(detailDraft.materia_prima_id),
  )

  const nextDetail = {
    materia_prima_id: String(detailDraft.materia_prima_id),
    es_principal: isPrincipal,
    gramos_base: isPrincipal ? valor : 0,
    porcentaje_principal: isPrincipal ? 0 : valor,
  }

  if (existingIndex >= 0) {
    details.value.splice(existingIndex, 1, nextDetail)
  } else {
    details.value.push(nextDetail)
  }

  if (isPrincipal) {
    details.value = details.value.map((detalle) => ({
      ...detalle,
      es_principal: String(detalle.materia_prima_id) === String(nextDetail.materia_prima_id),
      gramos_base: String(detalle.materia_prima_id) === String(nextDetail.materia_prima_id)
        ? nextDetail.gramos_base
        : 0,
    }))
  }

  feedback.value = ''
  resetDraft()
}

const removeDetail = (index) => {
  details.value.splice(index, 1)
  resetDraft()
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
  hydratedDetails.value.reduce((total, item) => total + Number(item.costo_total || 0), 0),
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
            <span>Tipo</span>
            <select v-model="detailDraft.tipo">
              <option value="principal">Ingrediente principal</option>
              <option value="porcentaje">Porcentaje sobre principal</option>
            </select>
          </label>

          <label>
            <span>{{ detailDraft.tipo === 'principal' ? 'Gramos del principal' : 'Porcentaje del principal' }}</span>
            <input v-model="detailDraft.valor" type="number" step="0.001" min="0" />
          </label>

          <button type="button" class="primary-action" @click="addDetail">Agregar insumo</button>
        </div>

        <div class="panel nested-panel">
          <div class="section-heading">
            <h4>Detalle formulado</h4>
            <strong>${{ costoTotal.toFixed(2) }}</strong>
          </div>

          <div v-if="principalDetail" class="summary-strip">
            <span>Principal: {{ store.getMateriaPrimaById(principalDetail.materia_prima_id)?.nombre || '-' }}</span>
            <strong>{{ Number(principalDetail.gramos_base || 0).toFixed(3) }} g</strong>
          </div>

          <div v-if="!hydratedDetails.length" class="empty-state">
            Define un ingrediente principal en gramos y luego agrega los demas como porcentaje.
          </div>

          <div v-else class="detail-list">
            <article v-for="(detalle, index) in hydratedDetails" :key="`${detalle.materia_prima_id}-${index}`" class="detail-item">
              <div>
                <strong>{{ detalle.materia_prima }}</strong>
                <p>{{ detalle.es_principal ? 'Principal' : `${Number(detalle.porcentaje_principal || 0).toFixed(2)}% del principal` }}</p>
                <p>{{ detalle.gramos_calculados.toFixed(3) }} g x ${{ detalle.costo_unitario.toFixed(2) }}</p>
              </div>
              <div class="row actions">
                <strong>${{ detalle.costo_total.toFixed(2) }}</strong>
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
