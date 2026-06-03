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

const extractDate = (text) => {
  const match = text.match(/\b\d{4}-\d{2}-\d{2}\b/)
  return match ? match[0] : today()
}

const cleanName = (value = '') =>
  value
    .replace(/\b(precio|venta|estimado|costo|unitario|total|cantidad|por|de|con|a|en|fecha)\b.*$/i, '')
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

export const createMcpChatAssistant = ({ store, navigate }) => {
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

    if (!text) {
      return {
        tool: 'ayuda',
        args: {},
      }
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

    if (/\b(producto)\b/.test(text) && /\b(crea|crear|agrega|agregar|nuevo)\b/.test(text)) {
      const nameMatch = rawText.match(/producto\s+(.+)/i)
      const precio = extractNumberAfter(rawText, ['precio', 'venta', 'estimado', 'por'])
      const nombre = cleanName(nameMatch ? nameMatch[1] : stripKnownWords(rawText))
      return { tool: 'producto.crear', args: { nombre, precio } }
    }

    if (/\b(materia prima|materia|insumo)\b/.test(text) && /\b(crea|crear|agrega|agregar|nuevo)\b/.test(text)) {
      const nameMatch = rawText.match(/(?:materia prima|materia|insumo)\s+(.+)/i)
      const costo = extractNumberAfter(rawText, ['costo', 'unitario', 'precio', 'por'])
      const nombre = cleanName(nameMatch ? nameMatch[1] : stripKnownWords(rawText))
      return { tool: 'materia_prima.crear', args: { nombre, costo } }
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

    return {
      tool: 'ayuda',
      args: {},
    }
  }

  const help = () =>
    [
      'Puedo ejecutar acciones locales usando herramientas tipo MCP.',
      'Prueba con:',
      '- "crea producto Pan precio 5000"',
      '- "agrega materia prima Harina costo 12"',
      '- "registra gasto Luz por 50000"',
      '- "vende 3 de Pan por 15000"',
      '- "produce 10 de Pan"',
      '- "consulta inventario" o "resumen del dashboard"',
    ].join('\n')

  const handleMessage = (message) => {
    const parsed = parse(message)
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
