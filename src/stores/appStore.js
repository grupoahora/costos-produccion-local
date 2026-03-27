import { defineStore } from 'pinia'
import { createBaseDB, readDB, writeDB } from '../services/storageService'

const emptyDb = createBaseDB

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeDate = (value) => {
  if (!value) return ''

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10)
    }

    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''

  return parsed.toISOString().slice(0, 10)
}

export const useAppStore = defineStore('appStore', {
  state: () => ({
    app_db: emptyDb(),
  }),

  actions: {
    init() {
      this.load()
      this.save()
    },

    load() {
      this.app_db = readDB()
      return true
    },

    save() {
      return writeDB(this.app_db)
    },

    getCostoTotalProduccion(produccionId) {
      const asociaciones = this.app_db.produccion_materia_prima.filter(
        (item) => String(item.produccion_id) === String(produccionId),
      )

      return asociaciones.reduce((total, asociacion) => {
        const materiaPrima = this.app_db.materias_primas.find(
          (item) => String(item.id) === String(asociacion.materia_prima_id),
        )

        const cantidadUsada = toNumber(
          asociacion.cantidad ?? asociacion.cantidad_usada,
        )

        const costoMateriaPrima = toNumber(
          materiaPrima?.costo_unitario ?? materiaPrima?.costo ?? materiaPrima?.precio,
        )

        return total + cantidadUsada * costoMateriaPrima
      }, 0)
    },

    getCostoUnitarioProduccion(produccionId) {
      const produccion = this.app_db.producciones.find(
        (item) => String(item.id) === String(produccionId),
      )

      const cantidad = toNumber(produccion?.cantidad)
      if (cantidad <= 0) return 0

      return this.getCostoTotalProduccion(produccionId) / cantidad
    },

    getProduccionesConCostos() {
      return this.app_db.producciones.map((produccion) => {
        const costoTotal = this.getCostoTotalProduccion(produccion.id)
        const cantidad = toNumber(produccion.cantidad)
        const costoUnitario = cantidad > 0 ? costoTotal / cantidad : 0

        return {
          ...produccion,
          costo_total: costoTotal,
          costo_unitario: costoUnitario,
        }
      })
    },

    getVentasAgrupadasPorFecha() {
      return this.app_db.ventas_diarias.reduce((acumulado, venta) => {
        const fecha = normalizeDate(venta.fecha ?? venta.date)
        if (!fecha) return acumulado

        const montoVenta = toNumber(
          venta.total ?? venta.monto ?? venta.importe,
        )

        acumulado[fecha] = (acumulado[fecha] ?? 0) + montoVenta
        return acumulado
      }, {})
    },

    getGastosAgrupadosPorFecha() {
      return this.app_db.gastos.reduce((acumulado, gasto) => {
        const fecha = normalizeDate(gasto.fecha ?? gasto.date)
        if (!fecha) return acumulado

        const montoGasto = toNumber(gasto.total ?? gasto.monto ?? gasto.importe)
        acumulado[fecha] = (acumulado[fecha] ?? 0) + montoGasto

        return acumulado
      }, {})
    },

    getUtilidadDiaria({ incluirCostoProduccionVendido = false } = {}) {
      const ventasPorFecha = this.getVentasAgrupadasPorFecha()
      const gastosPorFecha = this.getGastosAgrupadosPorFecha()

      const costoProduccionVendidoPorFecha = incluirCostoProduccionVendido
        ? this.app_db.ventas_diarias.reduce((acumulado, venta) => {
            const fecha = normalizeDate(venta.fecha ?? venta.date)
            if (!fecha || !venta.produccion_id) return acumulado

            const cantidadVendida = toNumber(
              venta.cantidad ?? venta.cantidad_vendida,
            )
            const costoUnitario = this.getCostoUnitarioProduccion(venta.produccion_id)

            acumulado[fecha] = (acumulado[fecha] ?? 0) + cantidadVendida * costoUnitario
            return acumulado
          }, {})
        : {}

      const fechas = new Set([
        ...Object.keys(ventasPorFecha),
        ...Object.keys(gastosPorFecha),
        ...Object.keys(costoProduccionVendidoPorFecha),
      ])

      return Array.from(fechas)
        .sort()
        .map((fecha) => {
          const ventas = ventasPorFecha[fecha] ?? 0
          const gastos = gastosPorFecha[fecha] ?? 0
          const costoProduccionVendido =
            costoProduccionVendidoPorFecha[fecha] ?? 0

          return {
            fecha,
            ventas,
            gastos,
            costo_produccion_vendido: costoProduccionVendido,
            utilidad: ventas - gastos - costoProduccionVendido,
          }
        })
    },

    normalizeDate,
  },
})
