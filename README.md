# Costos Producción Local

Aplicación web local para gestionar de forma simple:
- producción,
- costos de materias primas y costo unitario,
- ventas diarias,
- gastos operativos.

Está pensada para operar **sin backend** y guardar todo en el navegador del usuario.

## Objetivo de la app local

El objetivo es centralizar en una sola app local el control diario de:
1. Producción (qué se produce, cuánto y con qué insumos).
2. Costos (costo total por producción y costo unitario por producto).
3. Ventas diarias (monto vendido por fecha).
4. Gastos (egresos clasificados por tipo).

## Concepto clave de persistencia

Toda la información se guarda en **una sola clave de `localStorage`**:

- `app_db`

No existen múltiples claves por módulo: la app siempre lee y escribe el objeto completo `app_db`.

## Estructura exacta del objeto `app_db`

La estructura base contiene versión de esquema y **6 tablas** (arreglos):

```json
{
  "schemaVersion": 1,
  "productos": [],
  "producciones": [],
  "materias_primas": [],
  "produccion_materia_prima": [],
  "gastos": [],
  "ventas_diarias": []
}
```

### Tablas incluidas (6)

1. `productos`
2. `producciones`
3. `materias_primas`
4. `produccion_materia_prima`
5. `gastos`
6. `ventas_diarias`

## Flujos obligatorios

### 1) Flujo de producción

Secuencia obligatoria:
1. Crear producción.
2. Asociar materias primas usadas en esa producción.
3. Calcular costo total de producción (sumatoria de insumos asociados).
4. Calcular costo unitario (costo total / cantidad producida).

### 2) Flujo de venta

Secuencia obligatoria:
1. Registrar total vendido diario.
2. Asociar la venta a una fecha.

### 3) Flujo de gastos

Secuencia obligatoria:
1. Registrar gasto.
2. Clasificar el gasto por tipo.

## Importación y exportación

La app contempla respaldo e intercambio de datos en tres formatos:

### Exportación

- **JSON:** backup completo del objeto `app_db`.
- **Excel:** archivo con **una hoja por tabla**.
- **SQL:** script con sentencias `INSERT` compatibles con MySQL.

### Importación

- **JSON:** al importar, el contenido **reemplaza completamente** el `app_db` actual en `localStorage`.

## Decisiones técnicas y límites

1. **Sin backend:** no hay API ni base de datos remota.
2. **Persistencia local:** los datos viven en `localStorage` del navegador y del dispositivo actual.
3. **Alcance local:** la información no se sincroniza automáticamente entre equipos/usuarios.
4. **Respaldo recomendado:** exportar JSON de forma periódica para evitar pérdida de datos ante limpieza del navegador, cambio de dispositivo o fallas locales.
