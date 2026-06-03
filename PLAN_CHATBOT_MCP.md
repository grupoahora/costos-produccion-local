# Plan por fases para ampliar el chatbot MCP

Este documento organiza las acciones que deberia soportar el chatbot MCP segun las funcionalidades actuales del software. La idea es avanzar por fases, priorizando primero las acciones de mayor valor y menor riesgo.

## Fase 1: Acciones de alta prioridad

Estas acciones reducen clics repetitivos y ya estan soportadas en gran parte por el store actual.

- Crear producto. Ejemplo: "crea producto Pan precio 5000".
- Editar producto. Ejemplo: "cambia el precio de Pan a 5500".
- Eliminar producto, con confirmacion. Esta accion puede borrar producciones, ventas, recetas y movimientos relacionados.
- Crear materia prima. Ejemplo: "agrega materia prima Harina costo 12".
- Editar materia prima. Ejemplo: "actualiza costo de Harina a 14".
- Eliminar materia prima, con confirmacion. Esta accion puede afectar recetas, produccion e inventario.
- Registrar gasto. Ya existe en la primera version del chat.
- Editar gasto. Ejemplo: "corrige el gasto de Luz a 60000".
- Eliminar gasto, con confirmacion.
- Registrar movimiento de inventario. Ejemplos: "entrada de 20 kg de Harina", "ajusta Pan a 10 unidades", "salida de 3 de Azucar".
- Consultar inventario por item, por tipo y alertas. Ya existe parcialmente.
- Registrar venta. Ya existe en la primera version del chat.
- Eliminar venta, con confirmacion. Esta accion restaura o quita el movimiento de inventario asociado.
- Registrar produccion. Ya existe en la primera version del chat.
- Eliminar produccion, con confirmacion. Esta accion borra consumo, ventas asociadas y movimientos.

## Fase 2: Acciones para recetas

Recetas es una de las partes mas complejas del software, asi que el chat puede ahorrar mucho tiempo si guia la creacion y validacion.

- Crear o reemplazar receta para un producto.
- Agregar ingrediente principal en gramos.
- Agregar ingredientes secundarios como porcentaje del principal.
- Quitar ingrediente de receta.
- Consultar receta activa de un producto.
- Calcular costo estimado de una receta.
- Validar si se puede producir cierta cantidad segun inventario.
- Preguntar faltantes. Ejemplo: "que me falta para producir 50 panes".
- Eliminar receta de un producto, con confirmacion.

## Fase 3: Acciones de consulta y recomendacion

Estas acciones no modifican datos, asi que son seguras y buenas candidatas para ampliar pronto.

- Resumen del dashboard. Ya existe en la primera version del chat.
- Ventas por fecha o rango.
- Gastos por fecha o rango.
- Utilidad por fecha o rango.
- Productos mas producidos.
- Materias primas mas consumidas.
- Inventario critico.
- Movimientos recientes de inventario.
- Costo promedio de un producto.
- Costo unitario de una produccion.
- Historial de ventas de un producto.
- Historial de produccion de un producto.
- Valor total del inventario por productos o materias primas.

## Fase 4: Acciones de navegacion contextual

Ya existe navegacion basica por secciones, pero se puede hacer mas util conectandola con contexto.

- Ir a una seccion. Ya existe en la primera version del chat.
- Abrir seccion y preparar contexto. Ejemplo: "abre ventas para Pan".
- Abrir inventario filtrando producto o materia prima, si luego se agregan filtros en UI.
- Llevar al usuario a recetas de un producto especifico.

## Fase 5: Acciones de respaldo

Estas acciones conviene agregarlas con cuidado porque algunas pueden reemplazar datos.

- Exportar JSON.
- Exportar Excel.
- Exportar SQL.
- Explicar que contiene un respaldo.
- Validar estructura de un JSON antes de importar.
- Importar JSON solo con confirmacion fuerte, porque reemplaza toda la base.

## Reglas de seguridad recomendadas

- Toda accion destructiva debe pedir confirmacion antes de ejecutarse.
- Toda accion que reemplace datos completos, como importar JSON, debe pedir una confirmacion fuerte y explicita.
- Las consultas pueden ejecutarse directamente porque no modifican datos.
- Las acciones de creacion o registro pueden ejecutarse directamente si todos los datos requeridos estan claros.
- Si faltan datos, el chat debe pedir solo el dato faltante en lugar de fallar silenciosamente.

## Estado actual del chat

- Puede consultar resumen del dashboard.
- Puede consultar inventario general o por item.
- Puede crear productos.
- Puede crear materias primas.
- Puede registrar gastos.
- Puede registrar ventas.
- Puede registrar produccion.
- Puede navegar entre secciones principales.
