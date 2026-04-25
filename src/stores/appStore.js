import { defineStore } from 'pinia'
import { createBaseDB, readDB, writeDB } from '../services/storageService'

const emptyDb = createBaseDB

const INVENTORY_MOVEMENT_SIGNS = {
  entrada: 1,
  salida: -1,
  ajuste: 1,
  produccion_consumo: -1,
  produccion_ingreso: 1,
  venta_salida: -1,
}

const LOW_STOCK_THRESHOLD = 5

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
    normalized.receta_id = normalized.receta_id || ''
    normalized.costo_total = toNumber(normalized.costo_total)
    normalized.costo_unitario = toNumber(normalized.costo_unitario)
  }

  if (table === 'produccion_materia_prima') {
    normalized.produccion_id = normalized.produccion_id || ''
    normalized.materia_prima_id = normalized.materia_prima_id || ''
    normalized.cantidad = toNumber(normalized.cantidad)
    normalized.costo_unitario = toNumber(normalized.costo_unitario)
    normalized.costo_total = toNumber(normalized.costo_total)
  }

  if (table === 'gastos') {
    normalized.descripcion = (normalized.descripcion ?? '').toString().trim()
    normalized.total = toNumber(normalized.total)
    normalized.fecha = normalizeDate(normalized.fecha)
  }

  if (table === 'ventas_diarias') {
    normalized.produccion_id = normalized.produccion_id || ''
    normalized.producto_id = normalized.producto_id || ''
    normalized.cantidad = toNumber(normalized.cantidad)
    normalized.total = toNumber(normalized.total)
    normalized.fecha = normalizeDate(normalized.fecha)
  }

  if (table === 'inventario_movimientos') {
    normalized.item_tipo = normalized.item_tipo || 'materia_prima'
    normalized.item_id = normalized.item_id || ''
    normalized.tipo_movimiento = normalized.tipo_movimiento || 'entrada'
    normalized.cantidad = toNumber(normalized.cantidad)
    normalized.fecha = normalizeDate(normalized.fecha)
    normalized.nota = (normalized.nota ?? '').toString().trim()
    normalized.referencia_tipo = normalized.referencia_tipo || ''
    normalized.referencia_id = normalized.referencia_id || ''
    normalized.costo_unitario = toNumber(normalized.costo_unitario)
  }

  if (table === 'recetas') {
    normalized.producto_id = normalized.producto_id || ''
    normalized.nombre = (normalized.nombre ?? '').toString().trim()
    normalized.activa = normalized.activa !== false
    normalized.fecha_actualizacion = normalizeDate(
      normalized.fecha_actualizacion ?? normalized.fecha ?? new Date(),
    )
  }

  if (table === 'receta_detalles') {
    normalized.receta_id = normalized.receta_id || ''
    normalized.materia_prima_id = normalized.materia_prima_id || ''
    normalized.cantidad = toNumber(normalized.cantidad)
  }

  return normalized
}

const sortByDateAsc = (items) =>
  [...items].sort((a, b) => String(a.fecha ?? '').localeCompare(String(b.fecha ?? '')))

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
    movimientosInventario: (state) => state.app_db.inventario_movimientos,
    recetas: (state) => state.app_db.recetas,
    recetaDetalles: (state) => state.app_db.receta_detalles,
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
      const entityId = String(id)
      this.app_db[table] = this.app_db[table].filter((item) => String(item.id) !== entityId)

      if (table === 'producciones') {
        this.app_db.produccion_materia_prima = this.app_db.produccion_materia_prima.filter(
          (item) => String(item.produccion_id) !== entityId,
        )
        this.app_db.ventas_diarias = this.app_db.ventas_diarias.filter(
          (item) => String(item.produccion_id) !== entityId,
        )
        this.app_db.inventario_movimientos = this.app_db.inventario_movimientos.filter(
          (item) => !(item.referencia_tipo === 'produccion' && String(item.referencia_id) === entityId),
        )
      }

      if (table === 'materias_primas') {
        this.app_db.produccion_materia_prima = this.app_db.produccion_materia_prima.filter(
          (item) => String(item.materia_prima_id) !== entityId,
        )
        this.app_db.receta_detalles = this.app_db.receta_detalles.filter(
          (item) => String(item.materia_prima_id) !== entityId,
        )
        this.app_db.inventario_movimientos = this.app_db.inventario_movimientos.filter(
          (item) => !(item.item_tipo === 'materia_prima' && String(item.item_id) === entityId),
        )
      }

      if (table === 'productos') {
        const recipe = this.getRecipeByProduct(entityId)
        const relatedProductionIds = this.app_db.producciones
          .filter((item) => String(item.producto_id) === entityId)
          .map((item) => String(item.id))
        const relatedSaleIds = this.app_db.ventas_diarias
          .filter((item) => String(item.producto_id) === entityId)
          .map((item) => String(item.id))

        if (recipe) {
          this.deleteRecipeByProduct(entityId)
        }

        this.app_db.producciones = this.app_db.producciones.filter(
          (item) => String(item.producto_id) !== entityId,
        )
        this.app_db.produccion_materia_prima = this.app_db.produccion_materia_prima.filter(
          (item) => !relatedProductionIds.includes(String(item.produccion_id)),
        )
        this.app_db.ventas_diarias = this.app_db.ventas_diarias.filter(
          (item) => String(item.producto_id) !== entityId,
        )
        this.app_db.inventario_movimientos = this.app_db.inventario_movimientos.filter(
          (item) =>
            !(
              (item.item_tipo === 'producto' && String(item.item_id) === entityId) ||
              (item.referencia_tipo === 'produccion' && relatedProductionIds.includes(String(item.referencia_id))) ||
              (item.referencia_tipo === 'venta' && relatedSaleIds.includes(String(item.referencia_id)))
            ),
        )
      }

      if (table === 'recetas') {
        this.app_db.receta_detalles = this.app_db.receta_detalles.filter(
          (item) => String(item.receta_id) !== entityId,
        )
      }

      if (table === 'ventas_diarias') {
        this.app_db.inventario_movimientos = this.app_db.inventario_movimientos.filter(
          (item) => !(item.referencia_tipo === 'venta' && String(item.referencia_id) === entityId),
        )
      }

      this.save()
      return true
    },

    getProductoById(productoId) {
      return this.app_db.productos.find((item) => String(item.id) === String(productoId)) || null
    },

    getMateriaPrimaById(materiaPrimaId) {
      return this.app_db.materias_primas.find((item) => String(item.id) === String(materiaPrimaId)) || null
    },

    getRecipeByProduct(productoId) {
      const receta = this.app_db.recetas.find(
        (item) => String(item.producto_id) === String(productoId) && item.activa !== false,
      )
      if (!receta) return null

      const detalles = this.app_db.receta_detalles
        .filter((item) => String(item.receta_id) === String(receta.id))
        .map((detalle) => {
          const materiaPrima = this.getMateriaPrimaById(detalle.materia_prima_id)
          const costoUnitario = toNumber(materiaPrima?.costo_unitario)
          const cantidad = toNumber(detalle.cantidad)

          return {
            ...detalle,
            materia_prima_nombre: materiaPrima?.nombre || '-',
            costo_unitario: costoUnitario,
            costo_total: cantidad * costoUnitario,
          }
        })

      const costoEstimado = detalles.reduce((total, item) => total + item.costo_total, 0)

      return {
        ...receta,
        detalles,
        costo_estimado: costoEstimado,
      }
    },

    saveRecipeForProduct({ producto_id, nombre, detalles }) {
      const productId = String(producto_id || '')
      const trimmedDetails = (detalles || [])
        .map((detalle) => ({
          materia_prima_id: detalle.materia_prima_id,
          cantidad: toNumber(detalle.cantidad),
        }))
        .filter((detalle) => detalle.materia_prima_id && detalle.cantidad > 0)

      if (!productId) {
        return { ok: false, message: 'Debe seleccionar un producto.' }
      }

      if (!trimmedDetails.length) {
        return { ok: false, message: 'La receta debe tener al menos un insumo.' }
      }

      const existing = this.getRecipeByProduct(productId)
      const today = normalizeDate(new Date())
      let recetaId = existing?.id

      if (existing) {
        this.updateRecord('recetas', existing.id, {
          producto_id: productId,
          nombre: nombre || `Receta de ${this.getProductoById(productId)?.nombre || 'producto'}`,
          activa: true,
          fecha_actualizacion: today,
        })

        this.app_db.receta_detalles = this.app_db.receta_detalles.filter(
          (item) => String(item.receta_id) !== String(existing.id),
        )
      } else {
        const receta = this.createRecord('recetas', {
          producto_id: productId,
          nombre: nombre || `Receta de ${this.getProductoById(productId)?.nombre || 'producto'}`,
          activa: true,
          fecha_actualizacion: today,
        })
        recetaId = receta.id
      }

      trimmedDetails.forEach((detalle) => {
        this.app_db.receta_detalles.push({
          id: this.getNextId('receta_detalles'),
          ...normalizePayloadByTable('receta_detalles', {
            receta_id: recetaId,
            ...detalle,
          }),
        })
      })

      this.save()
      return { ok: true, receta: this.getRecipeByProduct(productId) }
    },

    deleteRecipeByProduct(productoId) {
      const recipe = this.getRecipeByProduct(productoId)
      if (!recipe) return false

      this.app_db.recetas = this.app_db.recetas.filter((item) => String(item.id) !== String(recipe.id))
      this.app_db.receta_detalles = this.app_db.receta_detalles.filter(
        (item) => String(item.receta_id) !== String(recipe.id),
      )
      this.save()
      return true
    },

    getRecipeRequirements(productoId, cantidadProducida) {
      const recipe = this.getRecipeByProduct(productoId)
      if (!recipe) {
        return { ok: false, message: 'El producto no tiene receta activa.', detalles: [] }
      }

      const cantidad = toNumber(cantidadProducida)
      const detalles = recipe.detalles.map((detalle) => {
        const cantidadRequerida = toNumber(detalle.cantidad) * cantidad
        const stockActual = this.getStockActual('materia_prima', detalle.materia_prima_id)
        const costoUnitario = toNumber(detalle.costo_unitario)

        return {
          materia_prima_id: detalle.materia_prima_id,
          materia_prima_nombre: detalle.materia_prima_nombre,
          cantidad_por_unidad: toNumber(detalle.cantidad),
          cantidad_requerida: cantidadRequerida,
          stock_actual: stockActual,
          stock_suficiente: stockActual >= cantidadRequerida,
          costo_unitario: costoUnitario,
          costo_total: cantidadRequerida * costoUnitario,
        }
      })

      return {
        ok: true,
        receta: recipe,
        detalles,
        costo_total: detalles.reduce((total, item) => total + item.costo_total, 0),
      }
    },

    createInventoryMovement(payload) {
      const normalized = normalizePayloadByTable('inventario_movimientos', payload)
      const record = {
        id: this.getNextId('inventario_movimientos'),
        ...normalized,
      }

      this.app_db.inventario_movimientos.push(record)
      return record
    },

    getMovementSignedQuantity(movement) {
      const quantity = movement.tipo_movimiento === 'ajuste'
        ? toNumber(movement.cantidad)
        : Math.abs(toNumber(movement.cantidad))
      const sign = INVENTORY_MOVEMENT_SIGNS[movement.tipo_movimiento] ?? 1
      return quantity * sign
    },

    getStockActual(itemTipo, itemId) {
      return this.app_db.inventario_movimientos
        .filter(
          (item) =>
            item.item_tipo === itemTipo &&
            String(item.item_id) === String(itemId),
        )
        .reduce((total, item) => total + this.getMovementSignedQuantity(item), 0)
    },

    getInventorySummary(itemTipo) {
      const source = itemTipo === 'producto' ? this.app_db.productos : this.app_db.materias_primas

      return source.map((item) => {
        const saldo = this.getStockActual(itemTipo, item.id)
        const costoUnitario = itemTipo === 'producto'
          ? this.getCostoPromedioProducto(item.id)
          : toNumber(item.costo_unitario)

        return {
          id: item.id,
          item_tipo: itemTipo,
          nombre: item.nombre,
          saldo,
          costo_unitario: costoUnitario,
          valor_inventario: saldo * costoUnitario,
          estado: saldo <= 0 ? 'critico' : saldo <= LOW_STOCK_THRESHOLD ? 'bajo' : 'ok',
        }
      })
    },

    getInventoryAlerts() {
      return [
        ...this.getInventorySummary('materia_prima'),
        ...this.getInventorySummary('producto'),
      ].filter((item) => item.estado !== 'ok')
    },

    getRecentInventoryMovements(limit = 12) {
      return sortByDateAsc(this.app_db.inventario_movimientos)
        .slice(-limit)
        .reverse()
        .map((movement) => {
          const label = movement.item_tipo === 'producto'
            ? this.getProductoById(movement.item_id)?.nombre
            : this.getMateriaPrimaById(movement.item_id)?.nombre

          return {
            ...movement,
            item_nombre: label || '-',
            cantidad_firmada: this.getMovementSignedQuantity(movement),
          }
        })
    },

    canProduce(productoId, cantidad) {
      const requirements = this.getRecipeRequirements(productoId, cantidad)
      if (!requirements.ok) return requirements

      const faltantes = requirements.detalles.filter((item) => !item.stock_suficiente)
      if (faltantes.length) {
        return {
          ok: false,
          message: 'No hay inventario suficiente para producir.',
          faltantes,
          detalles: requirements.detalles,
        }
      }

      return { ok: true, ...requirements }
    },

    registerProduction(payload) {
      const normalized = normalizePayloadByTable('producciones', payload)
      const validation = this.canProduce(normalized.producto_id, normalized.cantidad)
      if (!validation.ok) return validation

      const costTotal = validation.costo_total
      const cantidad = toNumber(normalized.cantidad)
      const costoUnitario = cantidad > 0 ? costTotal / cantidad : 0
      const produccionId = this.getNextId('producciones')

      const produccion = {
        id: produccionId,
        ...normalized,
        receta_id: validation.receta.id,
        costo_total: costTotal,
        costo_unitario: costoUnitario,
      }

      this.app_db.producciones.push(produccion)

      validation.detalles.forEach((detalle) => {
        this.app_db.produccion_materia_prima.push({
          id: this.getNextId('produccion_materia_prima'),
          ...normalizePayloadByTable('produccion_materia_prima', {
            produccion_id: produccionId,
            materia_prima_id: detalle.materia_prima_id,
            cantidad: detalle.cantidad_requerida,
            costo_unitario: detalle.costo_unitario,
            costo_total: detalle.costo_total,
          }),
        })

        this.createInventoryMovement({
          item_tipo: 'materia_prima',
          item_id: detalle.materia_prima_id,
          tipo_movimiento: 'produccion_consumo',
          cantidad: detalle.cantidad_requerida,
          fecha: produccion.fecha,
          referencia_tipo: 'produccion',
          referencia_id: produccionId,
          nota: `Consumo por produccion #${produccionId}`,
          costo_unitario: detalle.costo_unitario,
        })
      })

      this.createInventoryMovement({
        item_tipo: 'producto',
        item_id: produccion.producto_id,
        tipo_movimiento: 'produccion_ingreso',
        cantidad: produccion.cantidad,
        fecha: produccion.fecha,
        referencia_tipo: 'produccion',
        referencia_id: produccionId,
        nota: `Ingreso por produccion #${produccionId}`,
        costo_unitario: costoUnitario,
      })

      this.save()
      return {
        ok: true,
        produccion,
        detalles: validation.detalles,
      }
    },

    canSell(productoId, cantidad) {
      const stock = this.getStockActual('producto', productoId)
      const qty = toNumber(cantidad)

      if (!productoId) {
        return { ok: false, message: 'Debe seleccionar un producto.' }
      }

      if (qty <= 0) {
        return { ok: false, message: 'La cantidad vendida debe ser mayor a cero.' }
      }

      if (stock < qty) {
        return {
          ok: false,
          message: 'No hay inventario suficiente del producto terminado.',
          stock_actual: stock,
        }
      }

      return { ok: true, stock_actual: stock }
    },

    registerSale(payload) {
      const normalized = normalizePayloadByTable('ventas_diarias', payload)
      const validation = this.canSell(normalized.producto_id, normalized.cantidad)
      if (!validation.ok) return validation

      const sale = {
        id: this.getNextId('ventas_diarias'),
        ...normalized,
      }

      this.app_db.ventas_diarias.push(sale)

      this.createInventoryMovement({
        item_tipo: 'producto',
        item_id: sale.producto_id,
        tipo_movimiento: 'venta_salida',
        cantidad: sale.cantidad,
        fecha: sale.fecha,
        referencia_tipo: 'venta',
        referencia_id: sale.id,
        nota: `Salida por venta #${sale.id}`,
        costo_unitario: this.getCostoPromedioProducto(sale.producto_id),
      })

      this.save()
      return { ok: true, venta: sale }
    },

    getCostoTotalProduccion(produccionId) {
      const produccion = this.app_db.producciones.find(
        (item) => String(item.id) === String(produccionId),
      )

      if (toNumber(produccion?.costo_total) > 0) {
        return toNumber(produccion.costo_total)
      }

      const asociaciones = this.app_db.produccion_materia_prima.filter(
        (item) => String(item.produccion_id) === String(produccionId),
      )

      return asociaciones.reduce((total, asociacion) => {
        if (toNumber(asociacion.costo_total) > 0) {
          return total + toNumber(asociacion.costo_total)
        }

        const materiaPrima = this.app_db.materias_primas.find(
          (item) => String(item.id) === String(asociacion.materia_prima_id),
        )

        const cantidadUsada = toNumber(asociacion.cantidad ?? asociacion.cantidad_usada)
        const costoMateriaPrima = toNumber(
          asociacion.costo_unitario ??
          materiaPrima?.costo_unitario ??
          materiaPrima?.costo ??
          materiaPrima?.precio,
        )

        return total + cantidadUsada * costoMateriaPrima
      }, 0)
    },

    getCostoUnitarioProduccion(produccionId) {
      const produccion = this.app_db.producciones.find(
        (item) => String(item.id) === String(produccionId),
      )

      if (toNumber(produccion?.costo_unitario) > 0) {
        return toNumber(produccion.costo_unitario)
      }

      const cantidad = toNumber(produccion?.cantidad)
      if (cantidad <= 0) return 0

      return this.getCostoTotalProduccion(produccionId) / cantidad
    },

    getCostoPromedioProducto(productoId) {
      const producciones = this.app_db.producciones.filter(
        (item) => String(item.producto_id) === String(productoId),
      )

      const cantidadTotal = producciones.reduce((acc, item) => acc + toNumber(item.cantidad), 0)
      if (cantidadTotal <= 0) return 0

      const costoTotal = producciones.reduce(
        (acc, item) => acc + this.getCostoTotalProduccion(item.id),
        0,
      )

      return costoTotal / cantidadTotal
    },

    getProduccionesConCostos() {
      return this.app_db.producciones.map((produccion) => {
        const costoTotal = this.getCostoTotalProduccion(produccion.id)
        const cantidad = toNumber(produccion.cantidad)
        const costoUnitario = cantidad > 0 ? costoTotal / cantidad : 0
        const producto = this.getProductoById(produccion.producto_id)
        const recipe = this.getRecipeByProduct(produccion.producto_id)
        const stockSuficiente = !recipe
          ? false
          : this.canProduce(produccion.producto_id, produccion.cantidad).ok

        return {
          ...produccion,
          producto_nombre: producto?.nombre || '-',
          costo_total: costoTotal,
          costo_unitario: costoUnitario,
          receta_nombre: recipe?.nombre || 'Sin receta',
          stock_estado: stockSuficiente ? 'OK' : 'Sin stock',
        }
      })
    },

    getProduccionConsumoDetalle(produccionId) {
      return this.app_db.produccion_materia_prima
        .filter((item) => String(item.produccion_id) === String(produccionId))
        .map((item) => {
          const materiaPrima = this.getMateriaPrimaById(item.materia_prima_id)
          return {
            ...item,
            materia_prima: materiaPrima?.nombre || '-',
            costo_total: toNumber(item.costo_total) || (
              toNumber(item.cantidad) * toNumber(item.costo_unitario || materiaPrima?.costo_unitario)
            ),
          }
        })
    },

    getVentasAgrupadasPorFecha() {
      return this.app_db.ventas_diarias.reduce((acumulado, venta) => {
        const fecha = normalizeDate(venta.fecha ?? venta.date)
        if (!fecha) return acumulado

        const montoVenta = toNumber(venta.total ?? venta.monto ?? venta.importe)
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
            const productoId = venta.producto_id || this.app_db.producciones.find(
              (item) => String(item.id) === String(venta.produccion_id),
            )?.producto_id

            if (!fecha || !productoId) return acumulado

            const cantidadVendida = toNumber(venta.cantidad ?? venta.cantidad_vendida)
            const costoUnitario = this.getCostoPromedioProducto(productoId)

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
          const costoProduccionVendido = costoProduccionVendidoPorFecha[fecha] ?? 0

          return {
            fecha,
            ventas,
            gastos,
            costo_produccion_vendido: costoProduccionVendido,
            utilidad: ventas - gastos - costoProduccionVendido,
          }
        })
    },

    getDashboardMetrics() {
      const utilidadDiaria = this.getUtilidadDiaria({ incluirCostoProduccionVendido: true })
      const inventorySummary = [
        ...this.getInventorySummary('materia_prima'),
        ...this.getInventorySummary('producto'),
      ]
      const totalVentas = this.app_db.ventas_diarias.reduce((acc, item) => acc + toNumber(item.total), 0)
      const totalGastos = this.app_db.gastos.reduce((acc, item) => acc + toNumber(item.total), 0)
      const totalProducido = this.app_db.producciones.reduce((acc, item) => acc + toNumber(item.cantidad), 0)

      return {
        totalVentas,
        totalGastos,
        totalUtilidad: utilidadDiaria.reduce((acc, item) => acc + toNumber(item.utilidad), 0),
        totalProducido,
        valorInventario: inventorySummary.reduce((acc, item) => acc + item.valor_inventario, 0),
        alertasInventario: this.getInventoryAlerts().length,
      }
    },

    getDashboardSeries() {
      const utilidadDiaria = this.getUtilidadDiaria({ incluirCostoProduccionVendido: true })
      const produccionPorProducto = this.app_db.productos
        .map((producto) => ({
          label: producto.nombre,
          value: this.app_db.producciones
            .filter((item) => String(item.producto_id) === String(producto.id))
            .reduce((acc, item) => acc + toNumber(item.cantidad), 0),
        }))
        .filter((item) => item.value > 0)

      const consumoMateriaPrima = this.app_db.materias_primas
        .map((materia) => ({
          label: materia.nombre,
          value: this.app_db.inventario_movimientos
            .filter(
              (item) =>
                item.item_tipo === 'materia_prima' &&
                String(item.item_id) === String(materia.id) &&
                item.tipo_movimiento === 'produccion_consumo',
            )
            .reduce((acc, item) => acc + toNumber(item.cantidad), 0),
        }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)

      const inventarioCritico = [
        ...this.getInventorySummary('materia_prima'),
        ...this.getInventorySummary('producto'),
      ]
        .filter((item) => item.estado !== 'ok')
        .sort((a, b) => a.saldo - b.saldo)
        .slice(0, 5)
        .map((item) => ({
          label: item.nombre,
          value: item.saldo,
        }))

      return {
        utilidadDiaria,
        produccionPorProducto,
        consumoMateriaPrima,
        inventarioCritico,
      }
    },

    normalizeDate,
  },
})
