const today = () => new Date().toISOString().slice(0, 10)

const normalizeText = (value = '') =>
  value
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const toNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const normalized = String(value ?? '')
    .replace(/\$/g, '')
    .replace(/\s/g, '')
    .replace(/,/g, '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

const money = (value) => `$${toNumber(value).toFixed(2)}`

const findEntityByName = (items, name) => {
  const target = normalizeText(name)
  if (!target) return null

  return (
    items.find((item) => normalizeText(item.nombre) === target) ||
    items.find((item) => normalizeText(item.nombre).includes(target)) ||
    items.find((item) => target.includes(normalizeText(item.nombre)))
  )
}

const findExpenseByDescription = (items, description) => {
  const target = normalizeText(description)
  if (!target) return null

  return (
    items.find((item) => normalizeText(item.descripcion) === target) ||
    items.find((item) => normalizeText(item.descripcion).includes(target)) ||
    items.find((item) => target.includes(normalizeText(item.descripcion)))
  )
}

const findLatestByProduct = (items, productId) =>
  [...items]
    .filter((item) => !productId || String(item.producto_id) === String(productId))
    .sort((a, b) => String(b.fecha ?? '').localeCompare(String(a.fecha ?? '')) || Number(b.id) - Number(a.id))[0] || null

const findRecordByIdOrProduct = ({ records, id, productId }) => {
  if (id) {
    return records.find((item) => String(item.id) === String(id)) || null
  }

  return findLatestByProduct(records, productId)
}

const extractDate = (text) => {
  const match = text.match(/\b\d{4}-\d{2}-\d{2}\b/)
  return match ? match[0] : today()
}

const extractOptionalDate = (text) => {
  const match = text.match(/\b\d{4}-\d{2}-\d{2}\b/)
  return match ? match[0] : ''
}

const cleanName = (value = '') =>
  value
    .replace(/^\s*(?:de|del|el|la|los|las)\s+/i, '')
    .replace(/\b(precio|venta|estimado|costo|unitario|total|cantidad|por|con|en|fecha)\b.*$/i, '')
    .replace(/[,:;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const extractNumberAfter = (text, labels) => {
  const source = normalizeText(text)
  for (const label of labels) {
    const match = source.match(new RegExp(`\\b${label}\\b\\s*(?:de|por|:)?\\s*\\$?([0-9]+(?:[.,][0-9]+)?)`))
    if (match) return toNumber(match[1])
  }
  return 0
}

const stripKnownWords = (text) =>
  text
    .replace(/\b(crea|crear|agrega|agregar|registra|registrar|nuevo|nueva|un|una|el|la)\b/gi, '')
    .replace(/\b(producto|materia prima|materia|insumo|gasto|venta|produccion|produce|vende|vender)\b/gi, '')
    .trim()

const formatInventory = (items, limit = 8) => {
  if (!items.length) return 'No hay inventario registrado todavia.'

  return items
    .slice(0, limit)
    .map((item) => `${item.nombre}: ${Number(item.saldo).toFixed(2)} (${item.estado})`)
    .join('\n')
}

const formatDestructiveWarning = (summary, details) =>
  [
    summary,
    details,
    'Responde "confirmar" para ejecutar o "cancelar" para dejar todo igual.',
  ].filter(Boolean).join('\n')

const isConfirm = (text) => /\b(confirmar|confirmo|si|sí|ok|dale|acepto)\b/.test(normalizeText(text))

const isCancel = (text) => /\b(cancelar|cancela|no|detener|para|parar)\b/.test(normalizeText(text))

export const createMcpChatAssistant = ({ store, navigate }) => {
  let pendingConfirmation = null
  let pendingProductEdit = null

  const setPendingDelete = ({ label, warning, run }) => {
    pendingConfirmation = { label, run }
    return formatDestructiveWarning(`Voy a eliminar ${label}.`, warning)
  }

  const setPendingProductEdit = (producto) => {
    pendingProductEdit = {
      productoId: producto.id,
      nombre: producto.nombre,
      step: 'field',
    }

    return [
      `Vamos a editar el producto "${producto.nombre}".`,
      'Responde con:',
      '1 nombre',
      '2 precio',
      'O responde "cancelar" para salir.',
    ].join('\n')
  }

  const handlePendingProductEdit = (rawText) => {
    const text = normalizeText(rawText)

    if (isCancel(text)) {
      const productName = pendingProductEdit?.nombre
      pendingProductEdit = null
      return `Cancelado. No edite ${productName ? `el producto "${productName}"` : 'el producto'}.`
    }

    const product = store.getProductoById(pendingProductEdit.productoId)
    if (!product) {
      pendingProductEdit = null
      return 'Ya no encontre ese producto. Cancelo la edicion para evitar tocar otro registro.'
    }

    if (pendingProductEdit.step === 'field') {
      if (/^(1|nombre)$/.test(text) || /\bnombre\b/.test(text)) {
        pendingProductEdit.step = 'nombre'
        return `Escribe el nuevo nombre para "${product.nombre}".`
      }

      if (/^(2|precio)$/.test(text) || /\bprecio\b/.test(text)) {
        pendingProductEdit.step = 'precio'
        return `Escribe el nuevo precio para "${product.nombre}".`
      }

      return 'Elige que quieres editar: 1 nombre o 2 precio.'
    }

    if (pendingProductEdit.step === 'nombre') {
      const nuevoNombre = rawText.trim()
      if (!nuevoNombre) return 'Necesito un nombre no vacio para actualizar el producto.'

      const args = { id: product.id, nombre: product.nombre, nuevoNombre }
      pendingProductEdit = null
      return runTool('producto.editar', args).response
    }

    if (pendingProductEdit.step === 'precio') {
      const precio = toNumber(rawText)
      if (!Number.isFinite(precio) || precio < 0) return 'Necesito un precio valido. Ejemplo: 500.'

      const args = { id: product.id, nombre: product.nombre, precio }
      pendingProductEdit = null
      return runTool('producto.editar', args).response
    }

    pendingProductEdit = null
    return 'No pude continuar la edicion, asi que la cancele para no tocar datos por error.'
  }

  const findInventoryItem = (name, preferredType = '') => {
    const products = store.productos.map((item) => ({ ...item, item_tipo: 'producto' }))
    const materials = store.materiasPrimas.map((item) => ({ ...item, item_tipo: 'materia_prima' }))
    const source = preferredType === 'producto'
      ? products
      : preferredType === 'materia_prima'
        ? materials
        : [...materials, ...products]

    return findEntityByName(source, name)
  }

  const tools = [
    {
      name: 'dashboard.resumen',
      description: 'Consulta ventas, gastos, utilidad, produccion e inventario.',
      run: () => {
        const metrics = store.getDashboardMetrics()
        return [
          `Ventas acumuladas: ${money(metrics.totalVentas)}`,
          `Gastos acumulados: ${money(metrics.totalGastos)}`,
          `Utilidad estimada: ${money(metrics.totalUtilidad)}`,
          `Unidades producidas: ${Number(metrics.totalProducido).toFixed(2)}`,
          `Valor de inventario: ${money(metrics.valorInventario)}`,
          `Alertas de inventario: ${metrics.alertasInventario}`,
        ].join('\n')
      },
    },
    {
      name: 'inventario.consultar',
      description: 'Consulta stock de productos y materias primas.',
      run: (args = {}) => {
        const tipo = args.tipo || 'todos'
        const productInventory = store.getInventorySummary('producto')
        const materialInventory = store.getInventorySummary('materia_prima')

        if (args.nombre) {
          const item =
            findEntityByName(productInventory, args.nombre) ||
            findEntityByName(materialInventory, args.nombre)

          if (!item) return `No encontre "${args.nombre}" en el inventario.`
          return `${item.nombre} tiene ${Number(item.saldo).toFixed(2)} unidades disponibles. Estado: ${item.estado}.`
        }

        if (tipo === 'producto') return formatInventory(productInventory)
        if (tipo === 'materia_prima') return formatInventory(materialInventory)

        return [
          'Productos:',
          formatInventory(productInventory, 5),
          '',
          'Materias primas:',
          formatInventory(materialInventory, 5),
        ].join('\n')
      },
    },
    {
      name: 'producto.crear',
      description: 'Crea un producto con precio de venta estimado.',
      run: ({ nombre, precio }) => {
        if (!nombre) return 'Necesito el nombre del producto.'

        const existing = findEntityByName(store.productos, nombre)
        if (existing) return `Ya existe el producto "${existing.nombre}".`

        const record = store.createRecord('productos', {
          nombre,
          precio_venta_estimado: precio,
        })

        return `Producto creado: ${record.nombre} con precio estimado ${money(record.precio_venta_estimado)}.`
      },
    },
    {
      name: 'producto.editar',
      description: 'Edita nombre o precio de venta estimado de un producto.',
      run: ({ id, nombre, nuevoNombre, precio }) => {
        const existing = id
          ? store.getProductoById(id)
          : findEntityByName(store.productos, nombre)
        if (!existing) return `No encontre el producto "${nombre}".`

        const payload = {}
        if (nuevoNombre) payload.nombre = nuevoNombre
        if (precio >= 0) payload.precio_venta_estimado = precio
        if (!Object.keys(payload).length) return 'Necesito el nuevo nombre o precio del producto.'

        store.updateRecord('productos', existing.id, payload)
        const updated = store.getProductoById(existing.id)
        return `Producto actualizado: ${updated.nombre}, precio estimado ${money(updated.precio_venta_estimado)}.`
      },
    },
    {
      name: 'producto.eliminar',
      description: 'Elimina un producto con confirmacion.',
      run: ({ nombre }) => {
        const existing = findEntityByName(store.productos, nombre)
        if (!existing) return `No encontre el producto "${nombre}".`

        const productions = store.producciones.filter((item) => String(item.producto_id) === String(existing.id)).length
        const sales = store.ventas.filter((item) => String(item.producto_id) === String(existing.id)).length
        const recipe = store.getRecipeByProduct(existing.id)
        const movements = store.movimientosInventario.filter(
          (item) => item.item_tipo === 'producto' && String(item.item_id) === String(existing.id),
        ).length

        return setPendingDelete({
          label: `el producto "${existing.nombre}"`,
          warning: `Esto tambien puede borrar ${productions} produccion(es), ${sales} venta(s), ${recipe ? '1 receta' : '0 recetas'} y ${movements} movimiento(s) de inventario relacionados.`,
          run: () => {
            store.deleteRecord('productos', existing.id)
            return `Producto eliminado: ${existing.nombre}.`
          },
        })
      },
    },
    {
      name: 'materia_prima.crear',
      description: 'Crea una materia prima con costo unitario.',
      run: ({ nombre, costo }) => {
        if (!nombre) return 'Necesito el nombre de la materia prima.'

        const existing = findEntityByName(store.materiasPrimas, nombre)
        if (existing) return `Ya existe la materia prima "${existing.nombre}".`

        const record = store.createRecord('materias_primas', {
          nombre,
          costo_unitario: costo,
        })

        return `Materia prima creada: ${record.nombre} con costo unitario ${money(record.costo_unitario)}.`
      },
    },
    {
      name: 'materia_prima.editar',
      description: 'Edita nombre o costo unitario de una materia prima.',
      run: ({ nombre, nuevoNombre, costo }) => {
        const existing = findEntityByName(store.materiasPrimas, nombre)
        if (!existing) return `No encontre la materia prima "${nombre}".`

        const payload = {}
        if (nuevoNombre) payload.nombre = nuevoNombre
        if (costo > 0) payload.costo_unitario = costo
        if (!Object.keys(payload).length) return 'Necesito el nuevo nombre o costo unitario de la materia prima.'

        store.updateRecord('materias_primas', existing.id, payload)
        const updated = store.getMateriaPrimaById(existing.id)
        return `Materia prima actualizada: ${updated.nombre}, costo unitario ${money(updated.costo_unitario)}.`
      },
    },
    {
      name: 'materia_prima.eliminar',
      description: 'Elimina una materia prima con confirmacion.',
      run: ({ nombre }) => {
        const existing = findEntityByName(store.materiasPrimas, nombre)
        if (!existing) return `No encontre la materia prima "${nombre}".`

        const recipeDetails = store.recetaDetalles.filter((item) => String(item.materia_prima_id) === String(existing.id)).length
        const productionUses = store.asociaciones.filter((item) => String(item.materia_prima_id) === String(existing.id)).length
        const movements = store.movimientosInventario.filter(
          (item) => item.item_tipo === 'materia_prima' && String(item.item_id) === String(existing.id),
        ).length

        return setPendingDelete({
          label: `la materia prima "${existing.nombre}"`,
          warning: `Esto tambien puede afectar ${recipeDetails} ingrediente(s) de receta, ${productionUses} consumo(s) de produccion y ${movements} movimiento(s) de inventario.`,
          run: () => {
            store.deleteRecord('materias_primas', existing.id)
            return `Materia prima eliminada: ${existing.nombre}.`
          },
        })
      },
    },
    {
      name: 'gasto.registrar',
      description: 'Registra un gasto operativo.',
      run: ({ descripcion, total, fecha }) => {
        if (!descripcion || total <= 0) {
          return 'Para registrar un gasto necesito descripcion y total. Ejemplo: "registra gasto luz por 50000".'
        }

        const record = store.createRecord('gastos', { descripcion, total, fecha })
        return `Gasto registrado: ${record.descripcion} por ${money(record.total)} el ${record.fecha}.`
      },
    },
    {
      name: 'gasto.editar',
      description: 'Edita descripcion, monto o fecha de un gasto.',
      run: ({ descripcion, nuevaDescripcion, total, fecha }) => {
        const existing = findExpenseByDescription(store.gastos, descripcion)
        if (!existing) return `No encontre el gasto "${descripcion}".`

        const payload = {}
        if (nuevaDescripcion) payload.descripcion = nuevaDescripcion
        if (total > 0) payload.total = total
        if (fecha) payload.fecha = fecha
        if (!Object.keys(payload).length) return 'Necesito el nuevo valor, descripcion o fecha del gasto.'

        store.updateRecord('gastos', existing.id, payload)
        const updated = store.gastos.find((item) => String(item.id) === String(existing.id))
        return `Gasto actualizado: ${updated.descripcion} por ${money(updated.total)} el ${updated.fecha}.`
      },
    },
    {
      name: 'gasto.eliminar',
      description: 'Elimina un gasto con confirmacion.',
      run: ({ descripcion }) => {
        const existing = findExpenseByDescription(store.gastos, descripcion)
        if (!existing) return `No encontre el gasto "${descripcion}".`

        return setPendingDelete({
          label: `el gasto "${existing.descripcion}" por ${money(existing.total)}`,
          warning: 'Esta accion quitara el gasto del historial y cambiara los calculos de utilidad.',
          run: () => {
            store.deleteRecord('gastos', existing.id)
            return `Gasto eliminado: ${existing.descripcion}.`
          },
        })
      },
    },
    {
      name: 'inventario.movimiento',
      description: 'Registra entradas, salidas o ajustes de inventario.',
      run: ({ nombre, cantidad, tipoMovimiento, itemTipo, fecha, nota }) => {
        const item = findInventoryItem(nombre, itemTipo)
        if (!item) return `No encontre "${nombre}" como producto o materia prima.`
        if (!tipoMovimiento) return 'Necesito saber si el movimiento es entrada, salida o ajuste.'
        if (cantidad <= 0 && tipoMovimiento !== 'ajuste') return 'La cantidad del movimiento debe ser mayor a cero.'

        const stockActual = store.getStockActual(item.item_tipo, item.id)
        const cantidadMovimiento = tipoMovimiento === 'ajuste'
          ? cantidad - stockActual
          : cantidad

        if (tipoMovimiento === 'ajuste' && cantidadMovimiento === 0) {
          return `${item.nombre} ya tiene saldo ${Number(stockActual).toFixed(2)}. No registre cambios.`
        }

        const record = store.createRecord('inventario_movimientos', {
          item_tipo: item.item_tipo,
          item_id: item.id,
          tipo_movimiento: tipoMovimiento,
          cantidad: cantidadMovimiento,
          fecha,
          nota: nota || `Registrado desde chat MCP`,
          costo_unitario: item.item_tipo === 'producto'
            ? store.getCostoPromedioProducto(item.id)
            : item.costo_unitario,
        })

        const nuevoSaldo = store.getStockActual(item.item_tipo, item.id)
        return `Movimiento registrado para ${item.nombre}: ${record.tipo_movimiento} ${Number(record.cantidad).toFixed(2)}. Saldo actual: ${Number(nuevoSaldo).toFixed(2)}.`
      },
    },
    {
      name: 'venta.registrar',
      description: 'Registra una venta y descuenta inventario.',
      run: ({ producto, cantidad, total, fecha }) => {
        const item = findEntityByName(store.productos, producto)
        if (!item) return `No encontre el producto "${producto}".`

        const result = store.registerSale({
          producto_id: item.id,
          cantidad,
          total,
          fecha,
        })

        if (!result.ok) return result.message
        return `Venta registrada: ${Number(cantidad).toFixed(2)} de ${item.nombre} por ${money(total)}.`
      },
    },
    {
      name: 'venta.eliminar',
      description: 'Elimina una venta con confirmacion.',
      run: ({ id, producto }) => {
        const product = producto ? findEntityByName(store.productos, producto) : null
        if (producto && !product) return `No encontre el producto "${producto}".`

        const existing = findRecordByIdOrProduct({
          records: store.ventas,
          id,
          productId: product?.id,
        })
        if (!existing) return 'No encontre una venta para eliminar.'

        const productName = store.getProductoById(existing.producto_id)?.nombre || 'producto'
        return setPendingDelete({
          label: `la venta #${existing.id} de ${productName}`,
          warning: 'Esto borrara la venta y el movimiento de inventario asociado, restaurando el saldo calculado del producto.',
          run: () => {
            store.deleteRecord('ventas_diarias', existing.id)
            return `Venta eliminada: #${existing.id} de ${productName}.`
          },
        })
      },
    },
    {
      name: 'produccion.registrar',
      description: 'Registra produccion usando la receta activa y actualiza inventario.',
      run: ({ producto, cantidad, fecha }) => {
        const item = findEntityByName(store.productos, producto)
        if (!item) return `No encontre el producto "${producto}".`

        const result = store.registerProduction({
          producto_id: item.id,
          cantidad,
          fecha,
        })

        if (!result.ok) return result.message
        return `Produccion registrada: ${Number(cantidad).toFixed(2)} de ${item.nombre}. Costo total ${money(result.produccion.costo_total)}.`
      },
    },
    {
      name: 'produccion.eliminar',
      description: 'Elimina una produccion con confirmacion.',
      run: ({ id, producto }) => {
        const product = producto ? findEntityByName(store.productos, producto) : null
        if (producto && !product) return `No encontre el producto "${producto}".`

        const existing = findRecordByIdOrProduct({
          records: store.producciones,
          id,
          productId: product?.id,
        })
        if (!existing) return 'No encontre una produccion para eliminar.'

        const productName = store.getProductoById(existing.producto_id)?.nombre || 'producto'
        const relatedSales = store.ventas.filter((item) => String(item.produccion_id) === String(existing.id)).length
        return setPendingDelete({
          label: `la produccion #${existing.id} de ${productName}`,
          warning: `Esto borrara consumos, movimientos de inventario y ${relatedSales} venta(s) asociada(s) a esa produccion.`,
          run: () => {
            store.deleteRecord('producciones', existing.id)
            return `Produccion eliminada: #${existing.id} de ${productName}.`
          },
        })
      },
    },
    {
      name: 'navegacion.ir',
      description: 'Cambia de seccion en la aplicacion.',
      run: ({ tab }) => {
        if (!navigate) return 'La navegacion no esta disponible en este contexto.'
        navigate(tab)
        return `Te lleve a la seccion ${tab}.`
      },
    },
  ]

  const runTool = (name, args) => {
    const tool = tools.find((item) => item.name === name)
    if (!tool) return { tool: name, response: 'No encontre esa herramienta.' }

    return {
      tool: tool.name,
      response: tool.run(args),
    }
  }

  const parse = (rawText) => {
    const text = normalizeText(rawText)

    if (!text) return { tool: 'ayuda', args: {} }

    if (pendingConfirmation) {
      if (isConfirm(text)) return { tool: 'confirmacion.ejecutar', args: {} }
      if (isCancel(text)) return { tool: 'confirmacion.cancelar', args: {} }
    }

    const tabMap = {
      dashboard: 'dashboard',
      tablero: 'dashboard',
      productos: 'productos',
      producto: 'productos',
      materias: 'productos',
      recetas: 'recetas',
      inventario: 'inventario',
      produccion: 'produccion',
      ventas: 'ventas',
      gastos: 'gastos',
      respaldo: 'respaldo',
    }

    const navMatch = text.match(/\b(ir|ve|abre|mostrar|muestra)\b.*\b(dashboard|tablero|productos?|materias|recetas|inventario|produccion|ventas|gastos|respaldo)\b/)
    if (navMatch) return { tool: 'navegacion.ir', args: { tab: tabMap[navMatch[2]] } }

    if (/\b(resumen|dashboard|tablero|metricas|utilidad|como vamos)\b/.test(text)) {
      return { tool: 'dashboard.resumen', args: {} }
    }

    if (/\b(stock|inventario|existencias?|disponible)\b/.test(text)) {
      const nameMatch = text.match(/\b(?:de|del|para)\s+(.+)$/)
      const tipo = /\b(productos?|terminado)\b/.test(text)
        ? 'producto'
        : /\b(materias?|insumos?)\b/.test(text)
          ? 'materia_prima'
          : 'todos'

      return {
        tool: 'inventario.consultar',
        args: {
          tipo,
          nombre: nameMatch ? cleanName(nameMatch[1]) : '',
        },
      }
    }

    if (/\b(producto)\b/.test(text) && /\b(elimina|eliminar|borra|borrar|quita|quitar)\b/.test(text)) {
      const nameMatch = rawText.match(/producto\s+(.+)$/i) ||
        rawText.match(/(?:elimina|eliminar|borra|borrar|quita|quitar)\s+(.+)$/i)
      return { tool: 'producto.eliminar', args: { nombre: cleanName(nameMatch ? nameMatch[1] : '') } }
    }

    if (/\b(producto|precio)\b/.test(text) && /\b(cambia|cambiar|actualiza|actualizar|edita|editar|corrige|corregir)\b/.test(text)) {
      const priceMatch = rawText.match(/precio\s+de\s+(.+?)\s+a\s+\$?([0-9.,]+)/i) ||
        rawText.match(/precio\s+de\s+(.+?)\s+\$?([0-9.,]+)$/i) ||
        rawText.match(/(?:editar|edita|cambiar|cambia|actualizar|actualiza|corregir|corrige)\s+precio\s+de\s+(.+?)\s+\$?([0-9.,]+)$/i) ||
        rawText.match(/(.+?)\s+(?:precio|venta|estimado)\s+(?:a|por|en)\s+\$?([0-9.,]+)/i)
      const nameMatch = rawText.match(/producto\s+(.+?)(?:\s+(?:precio|venta|estimado|a|por|en)\s+\$?[0-9.,]+|$)/i)
      return {
        tool: 'producto.editar',
        args: {
          nombre: cleanName(priceMatch?.[1] || nameMatch?.[1] || ''),
          precio: toNumber(priceMatch?.[2] || extractNumberAfter(rawText, ['precio', 'venta', 'estimado'])),
        },
      }
    }

    if (/\b(producto)\b/.test(text) && /\b(crea|crear|agrega|agregar|nuevo)\b/.test(text)) {
      const nameMatch = rawText.match(/producto\s+(.+)/i)
      const precio = extractNumberAfter(rawText, ['precio', 'venta', 'estimado', 'por'])
      const nombre = cleanName(nameMatch ? nameMatch[1] : stripKnownWords(rawText))
      return { tool: 'producto.crear', args: { nombre, precio } }
    }

    if (/\b(materia prima|materia|insumo)\b/.test(text) && /\b(elimina|eliminar|borra|borrar|quita|quitar)\b/.test(text)) {
      const nameMatch = rawText.match(/(?:materia prima|materia|insumo)\s+(.+)$/i) ||
        rawText.match(/(?:elimina|eliminar|borra|borrar|quita|quitar)\s+(.+)$/i)
      return { tool: 'materia_prima.eliminar', args: { nombre: cleanName(nameMatch ? nameMatch[1] : '') } }
    }

    if (/\b(materia prima|materia|insumo|costo)\b/.test(text) && /\b(cambia|cambiar|actualiza|actualizar|edita|editar|corrige|corregir)\b/.test(text)) {
      const costMatch = rawText.match(/costo\s+de\s+(.+?)\s+a\s+\$?([0-9.,]+)/i) ||
        rawText.match(/(.+?)\s+(?:costo|unitario|precio)\s+(?:a|por|en)\s+\$?([0-9.,]+)/i)
      const nameMatch = rawText.match(/(?:materia prima|materia|insumo)\s+(.+?)(?:\s+(?:costo|unitario|precio|a|por|en)\s+\$?[0-9.,]+|$)/i)
      return {
        tool: 'materia_prima.editar',
        args: {
          nombre: cleanName(costMatch?.[1] || nameMatch?.[1] || ''),
          costo: toNumber(costMatch?.[2] || extractNumberAfter(rawText, ['costo', 'unitario', 'precio'])),
        },
      }
    }

    if (/\b(materia prima|materia|insumo)\b/.test(text) && /\b(crea|crear|agrega|agregar|nuevo)\b/.test(text)) {
      const nameMatch = rawText.match(/(?:materia prima|materia|insumo)\s+(.+)/i)
      const costo = extractNumberAfter(rawText, ['costo', 'unitario', 'precio', 'por'])
      const nombre = cleanName(nameMatch ? nameMatch[1] : stripKnownWords(rawText))
      return { tool: 'materia_prima.crear', args: { nombre, costo } }
    }

    if (/\b(gasto)\b/.test(text) && /\b(elimina|eliminar|borra|borrar|quita|quitar)\b/.test(text)) {
      const descriptionMatch = rawText.match(/gasto\s+(.+)$/i) ||
        rawText.match(/(?:elimina|eliminar|borra|borrar|quita|quitar)\s+(.+)$/i)
      return { tool: 'gasto.eliminar', args: { descripcion: cleanName(descriptionMatch ? descriptionMatch[1] : '') } }
    }

    if (/\b(gasto)\b/.test(text) && /\b(cambia|cambiar|actualiza|actualizar|edita|editar|corrige|corregir)\b/.test(text)) {
      const total = extractNumberAfter(rawText, ['total', 'por', 'valor', 'monto', 'a'])
      const descriptionMatch = rawText.match(/gasto\s+(.+?)(?:\s+(?:a|por|total|valor|monto)\s+\$?[0-9.,]+|$)/i)
      return {
        tool: 'gasto.editar',
        args: {
          descripcion: cleanName(descriptionMatch ? descriptionMatch[1] : stripKnownWords(rawText)),
          total,
          fecha: extractOptionalDate(rawText),
        },
      }
    }

    if (/\b(gasto)\b/.test(text) && /\b(registra|registrar|agrega|agregar|nuevo)\b/.test(text)) {
      const total = extractNumberAfter(rawText, ['total', 'por', 'valor', 'monto'])
      const descriptionMatch = rawText.match(/gasto\s+(.+?)(?:\s+(?:por|total|valor|monto)\s+\$?[0-9.,]+|$)/i)
      return {
        tool: 'gasto.registrar',
        args: {
          descripcion: cleanName(descriptionMatch ? descriptionMatch[1] : stripKnownWords(rawText)),
          total,
          fecha: extractDate(rawText),
        },
      }
    }

    if (/\b(entrada|salida|ajusta|ajustar|ajuste)\b/.test(text)) {
      const tipoMovimiento = /\b(ajusta|ajustar|ajuste)\b/.test(text)
        ? 'ajuste'
        : /\bsalida\b/.test(text)
          ? 'salida'
          : 'entrada'
      const adjustMatch = rawText.match(/(?:ajusta|ajustar|ajuste)\s+(.+?)\s+a\s+([0-9]+(?:[.,][0-9]+)?)(?:\s+(?:kg|g|gramos|unidades|unidad))?(?:\s+fecha\s+\d{4}-\d{2}-\d{2}|$)/i)
      const quantityMatch = adjustMatch ||
        text.match(/\b(?:entrada|salida)(?:\s+de)?\s+([0-9]+(?:[.,][0-9]+)?)/)
      const nameMatch = adjustMatch ||
        rawText.match(/(?:entrada|salida)(?:\s+de)?\s+[0-9]+(?:[.,][0-9]+)?(?:\s+(?:kg|g|gramos|unidades|unidad))?\s+(?:de\s+)?(.+?)(?:\s+fecha\s+\d{4}-\d{2}-\d{2}|$)/i)
      const itemTipo = /\b(producto|panes|terminado)\b/.test(text)
        ? 'producto'
        : /\b(materia prima|materia|insumo)\b/.test(text)
          ? 'materia_prima'
          : ''

      return {
        tool: 'inventario.movimiento',
        args: {
          nombre: cleanName(nameMatch ? nameMatch[1] : ''),
          cantidad: toNumber(adjustMatch ? adjustMatch[2] : quantityMatch?.[1]),
          tipoMovimiento,
          itemTipo,
          fecha: extractDate(rawText),
        },
      }
    }

    if (/\b(venta)\b/.test(text) && /\b(elimina|eliminar|borra|borrar|quita|quitar)\b/.test(text)) {
      const idMatch = text.match(/#?([0-9]+)/)
      const productMatch = rawText.match(/(?:de|del)\s+(.+?)$/i)
      return {
        tool: 'venta.eliminar',
        args: {
          id: idMatch?.[1],
          producto: cleanName(productMatch ? productMatch[1] : ''),
        },
      }
    }

    if (/\b(venta|vende|vender)\b/.test(text)) {
      const quantityMatch = text.match(/\b(?:vende|venta|vender|registra venta)\s+([0-9]+(?:[.,][0-9]+)?)/)
      const productMatch = rawText.match(/(?:de|del)\s+(.+?)(?:\s+(?:por|total|valor|monto)\s+\$?[0-9.,]+|$)/i)
      const total = extractNumberAfter(rawText, ['total', 'por', 'valor', 'monto'])
      return {
        tool: 'venta.registrar',
        args: {
          producto: cleanName(productMatch ? productMatch[1] : ''),
          cantidad: toNumber(quantityMatch?.[1]),
          total,
          fecha: extractDate(rawText),
        },
      }
    }

    if (/\b(produccion)\b/.test(text) && /\b(elimina|eliminar|borra|borrar|quita|quitar)\b/.test(text)) {
      const idMatch = text.match(/#?([0-9]+)/)
      const productMatch = rawText.match(/(?:de|del)\s+(.+?)$/i)
      return {
        tool: 'produccion.eliminar',
        args: {
          id: idMatch?.[1],
          producto: cleanName(productMatch ? productMatch[1] : ''),
        },
      }
    }

    if (/\b(produce|produccion|producir|fabrica)\b/.test(text)) {
      const quantityMatch = text.match(/\b(?:produce|produccion|producir|fabrica|registrar produccion)\s+([0-9]+(?:[.,][0-9]+)?)/)
      const productMatch = rawText.match(/(?:de|del)\s+(.+?)(?:\s+fecha\s+\d{4}-\d{2}-\d{2}|$)/i)
      return {
        tool: 'produccion.registrar',
        args: {
          producto: cleanName(productMatch ? productMatch[1] : ''),
          cantidad: toNumber(quantityMatch?.[1]),
          fecha: extractDate(rawText),
        },
      }
    }

    return { tool: 'ayuda', args: {} }
  }

  const help = () =>
    [
      'Puedo ejecutar acciones locales usando herramientas tipo MCP.',
      'Prueba con:',
      '- "crea producto Pan precio 5000"',
      '- "cambia el precio de Pan a 5500"',
      '- "elimina producto Pan"',
      '- "agrega materia prima Harina costo 12"',
      '- "actualiza costo de Harina a 14"',
      '- "registra gasto Luz por 50000"',
      '- "corrige el gasto de Luz a 60000"',
      '- "entrada de 20 kg de Harina"',
      '- "vende 3 de Pan por 15000"',
      '- "elimina venta de Pan"',
      '- "produce 10 de Pan"',
      '- "elimina produccion de Pan"',
      '- "consulta inventario" o "resumen del dashboard"',
    ].join('\n')

  const handleMessage = (message) => {
    const parsed = parse(message)
    if (parsed.tool === 'confirmacion.ejecutar') {
      const action = pendingConfirmation
      pendingConfirmation = null
      return {
        tool: 'confirmacion.ejecutar',
        response: action ? action.run() : 'No hay una accion pendiente por confirmar.',
      }
    }

    if (parsed.tool === 'confirmacion.cancelar') {
      const label = pendingConfirmation?.label
      pendingConfirmation = null
      return {
        tool: 'confirmacion.cancelar',
        response: label ? `Cancelado. No elimine ${label}.` : 'No hay una accion pendiente por cancelar.',
      }
    }

    if (parsed.tool === 'ayuda') {
      return {
        tool: 'ayuda',
        response: help(),
      }
    }

    return runTool(parsed.tool, parsed.args)
  }

  return {
    tools,
    handleMessage,
    help,
  }
}
