<script setup>
import { computed, ref } from 'vue'
import { useAppStore } from '../stores/appStore'
import ProductoForm from '../modules/productos/ProductoForm.vue'
import ProductoList from '../modules/productos/ProductoList.vue'

const store = useAppStore()
const productoEdicion = ref({})
const materiaEdicion = ref({})

const productos = computed(() => store.productos)
const materiasPrimas = computed(() => store.materiasPrimas)

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
    <h2>Gestión de productos y materias primas</h2>

    <div class="split">
      <ProductoForm :model-value="productoEdicion" @submit="saveProducto" @cancel="productoEdicion = {}" />
      <ProductoList
        title="Productos"
        :rows="productos"
        @edit="productoEdicion = { ...$event }"
        @delete="store.deleteRecord('productos', $event.id)"
      />
    </div>

    <div class="split">
      <ProductoForm style="height:auto;" :model-value="materiaEdicion" @submit="saveMateria" @cancel="materiaEdicion = {}" />
      <ProductoList
        title="Materias primas"
        :rows="materiasPrimas"
        @edit="materiaEdicion = { ...$event }"
        @delete="store.deleteRecord('materias_primas', $event.id)"
      />
    </div>
  </section>
</template>
