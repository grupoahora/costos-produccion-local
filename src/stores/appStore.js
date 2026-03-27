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

const normalizePayloadByTable = (table, payload = {}) => {
  const normalized = { ...payload }

  if ('fecha' in normalized) {
    normalized.fecha = normalizeDate(normalized.fecha)
  }

  if (table === 'productos' || table === 'materias_primas') {
    normalized.nombre = (normalized.nombre ?? '').toString().trim()
    normalized.costo_unitario = toNumber(normalized.costo_unitario)
  }

  if (table === 'producciones') {
    normalized.producto_id = normalized.producto_id || ''
    normalized.cantidad = toNumber(normalized.cantidad)
    normalized.fecha = normalizeDate(normalized.fecha)
  }

  if (table === 'produccion_materia_prima') {
    normalized.produccion_id = normalized.produccion_id || ''
    normalized.materia_prima_id = normalized.materia_prima_id || ''
    normalized.cantidad = toNumber(normalized.cantidad)
  }

  if (table === 'gastos') {
    normalized.descripcion = (normalized.descripcion ?? '').toString().trim()
    normalized.total = toNumber(normalized.total)
    normalized.fecha = normalizeDate(normalized.fecha)
  }

  if (table === 'ventas_diarias') {
    normalized.produccion_id = normalized.produccion_id || ''
    normalized.cantidad = toNumber(normalized.cantidad)
    normalized.total = toNumber(normalized.total)
    normalized.fecha = normalizeDate(normalized.fecha)
  }

  return normalized
}

export const useAppStore = defineStore('appStore', {
  state: () => ({
    app_db: emptyDb(),
  }),

  getters: {
    productos: (state) => state.app_db.productos,
    materiasPrimas: (state) => state.app_db.materias_primas,
    producciones: (state) => state.app_db.producciones,
    asociaciones: (state) => state.app_db.produccion_materia_prima,
    gastos: (state) => state.app_db.gastos,
    ventas: (state) => state.app_db.ventas_diarias,
  },

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

    getNextId(table) {
      const ids = (this.app_db[table] ?? []).map((item) => toNumber(item.id))
      return Math.max(0, ...ids) + 1
    },

    createRecord(table, payload) {
      const next = {
        id: this.getNextId(table),
        ...normalizePayloadByTable(table, payload),
      }

      this.app_db[table].push(next)
      this.save()
      return next
    },

    updateRecord(table, id, payload) {
      const index = this.app_db[table].findIndex((item) => String(item.id) === String(id))
      if (index < 0) return false

      this.app_db[table][index] = {
        ...this.app_db[table][index],
        ...normalizePayloadByTable(table, payload),
      }

      this.save()
      return true
    },

    deleteRecord(table, id) {
      const filtered = this.app_db[table].filter((item) => String(item.id) !== String(id))
      this.app_db[table] = filtered

      if (table === 'producciones') {
        this.app_db.produccion_materia_prima = this.app_db.produccion_materia_prima.filter(
          (item) => String(item.produccion_id) !== String(id),
        )
        this.app_db.ventas_diarias = this.app_db.ventas_diarias.filter(
          (item) => String(item.produccion_id) !== String(id),
        )
      }

      if (table === 'materias_primas') {
        this.app_db.produccion_materia_prima = this.app_db.produccion_materia_prima.filter(
          (item) => String(item.materia_prima_id) !== String(id),
        )
      }

      this.save()
      return true
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
