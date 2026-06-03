<script setup>
import { computed, ref } from 'vue'
import { useAppStore } from '../stores/appStore'
import ProductoForm from '../modules/productos/ProductoForm.vue'
import ProductoList from '../modules/productos/ProductoList.vue'

const store = useAppStore()
const productoEdicion = ref({})
const materiaEdicion = ref({})
const productosRows = computed(() =>
  store.productos.map((item) => ({
    ...item,
    precio_venta_estimado: `$${Number(item.precio_venta_estimado ?? item.costo_unitario ?? 0).toFixed(2)}`,
  })),
)
const materiasRows = computed(() =>
  store.materiasPrimas.map((item) => ({
    ...item,
    costo_unitario: `$${Number(item.costo_unitario || 0).toFixed(2)}`,
  })),
)

const saveProducto = (payload) => {
  if (payload.id) store.updateRecord('productos', payload.id, payload)
  else store.createRecord('productos', payload)
  productoEdicion.value = {}
}

const saveMateria = (payload) => {
  if (payload.id) store.updateRecord('materias_primas', payload.id, payload)
  else store.createRecord('materias_primas', payload)
  materiaEdicion.value = {}
}
</script>

<template>
  <section class="stack">
    <h2>Gestion de productos y materias primas</h2>

    <div class="split">
      <ProductoForm entity-type="producto" :model-value="productoEdicion" @submit="saveProducto" @cancel="productoEdicion = {}" />
      <ProductoList
        title="Productos"
        entity-type="producto"
        :rows="productosRows"
        @edit="productoEdicion = { ...$event }"
        @delete="store.deleteRecord('productos', $event.id)"
      />
    </div>

    <div class="split">
      <ProductoForm entity-type="materia_prima" :model-value="materiaEdicion" @submit="saveMateria" @cancel="materiaEdicion = {}" />
      <ProductoList
        title="Materias primas"
        entity-type="materia_prima"
        :rows="materiasRows"
        @edit="materiaEdicion = { ...$event }"
        @delete="store.deleteRecord('materias_primas', $event.id)"
      />
    </div>
  </section>
</template>
