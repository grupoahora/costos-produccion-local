<script setup>
import { computed, ref } from 'vue'
import { useAppStore } from '../stores/appStore'
import ProduccionForm from '../modules/produccion/ProduccionForm.vue'
import ProduccionList from '../modules/produccion/ProduccionList.vue'
import AsociacionForm from '../modules/produccion/AsociacionForm.vue'
import AsociacionList from '../modules/produccion/AsociacionList.vue'

const store = useAppStore()
const produccionEdicion = ref({})
const asociacionEdicion = ref({})

const produccionesConCostos = computed(() =>
  store.getProduccionesConCostos().map((produccion) => ({
    ...produccion,
    producto: store.productos.find((p) => String(p.id) === String(produccion.producto_id))?.nombre || '-',
    costo_total: `$${produccion.costo_total.toFixed(2)}`,
    costo_unitario: `$${produccion.costo_unitario.toFixed(2)}`,
  })),
)

const asociaciones = computed(() =>
  store.asociaciones.map((item) => ({
    ...item,
    produccion: `#${item.produccion_id}`,
    materia_prima: store.materiasPrimas.find((mp) => String(mp.id) === String(item.materia_prima_id))?.nombre || '-',
  })),
)

const saveProduccion = (payload) => {
  if (payload.id) store.updateRecord('producciones', payload.id, payload)
  else store.createRecord('producciones', payload)
  produccionEdicion.value = {}
}

const saveAsociacion = (payload) => {
  if (payload.id) store.updateRecord('produccion_materia_prima', payload.id, payload)
  else store.createRecord('produccion_materia_prima', payload)
  asociacionEdicion.value = {}
}
</script>

<template>
  <section class="stack">
    <h2>Producción</h2>

    <div class="split">
      <ProduccionForm
        :model-value="produccionEdicion"
        :productos="store.productos"
        @submit="saveProduccion"
        @cancel="produccionEdicion = {}"
      />
      <ProduccionList
        :rows="produccionesConCostos"
        @edit="produccionEdicion = { ...$event }"
        @delete="store.deleteRecord('producciones', $event.id)"
      />
    </div>

    <div class="split">
      <AsociacionForm
        :model-value="asociacionEdicion"
        :producciones="produccionesConCostos"
        :materias-primas="store.materiasPrimas"
        @submit="saveAsociacion"
        @cancel="asociacionEdicion = {}"
      />
      <AsociacionList
        :rows="asociaciones"
        @edit="asociacionEdicion = { ...$event }"
        @delete="store.deleteRecord('produccion_materia_prima', $event.id)"
      />
    </div>
  </section>
</template>
