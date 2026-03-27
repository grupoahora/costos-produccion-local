<script setup>
import { computed, ref } from 'vue'
import { useAppStore } from '../stores/appStore'
import VentaForm from '../modules/ventas/VentaForm.vue'
import VentaList from '../modules/ventas/VentaList.vue'

const store = useAppStore()
const ventaEdicion = ref({})

const producciones = computed(() =>
  store.getProduccionesConCostos().map((item) => ({
    ...item,
    producto: store.productos.find((p) => String(p.id) === String(item.producto_id))?.nombre || '-',
  })),
)

const ventas = computed(() =>
  store.ventas.map((venta) => ({
    ...venta,
    produccion: `#${venta.produccion_id}`,
    total: `$${Number(venta.total).toFixed(2)}`,
  })),
)

const saveVenta = (payload) => {
  if (payload.id) store.updateRecord('ventas_diarias', payload.id, payload)
  else store.createRecord('ventas_diarias', payload)
  ventaEdicion.value = {}
}
</script>

<template>
  <section class="stack">
    <h2>Ventas diarias</h2>
    <div class="split">
      <VentaForm
        :model-value="ventaEdicion"
        :producciones="producciones"
        @submit="saveVenta"
        @cancel="ventaEdicion = {}"
      />
      <VentaList
        :rows="ventas"
        @edit="ventaEdicion = { ...$event }"
        @delete="store.deleteRecord('ventas_diarias', $event.id)"
      />
    </div>
  </section>
</template>
