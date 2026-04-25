const STORAGE_KEY = 'app_db'
export const SCHEMA_VERSION = 2

export const REQUIRED_TABLES = [
  'productos',
  'producciones',
  'materias_primas',
  'produccion_materia_prima',
  'gastos',
  'ventas_diarias',
  'inventario_movimientos',
  'recetas',
  'receta_detalles',
]

export const createBaseDB = () => ({
  schemaVersion: SCHEMA_VERSION,
  productos: [],
  producciones: [],
  materias_primas: [],
  produccion_materia_prima: [],
  gastos: [],
  ventas_diarias: [],
  inventario_movimientos: [],
  recetas: [],
  receta_detalles: [],
})

const isBrowser = () => typeof window !== 'undefined' && !!window.localStorage

const ensureTableShape = (db) => {
  const base = createBaseDB()
  if (!db || typeof db !== 'object') return base

  const normalized = {
    ...base,
    ...db,
  }

  REQUIRED_TABLES.forEach((tableName) => {
    if (!Array.isArray(normalized[tableName])) {
      normalized[tableName] = []
    }
  })

  const parsedVersion = Number(normalized.schemaVersion)
  normalized.schemaVersion = Number.isInteger(parsedVersion) && parsedVersion > 0
    ? Math.max(parsedVersion, SCHEMA_VERSION)
    : SCHEMA_VERSION

  return normalized
}

export const readDB = () => {
  if (!isBrowser()) return createBaseDB()

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createBaseDB()

    const parsed = JSON.parse(raw)
    return ensureTableShape(parsed)
  } catch {
    return createBaseDB()
  }
}

export const writeDB = (db) => {
  if (!isBrowser()) return false

  const normalized = ensureTableShape(db)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
    return true
  } catch {
    return false
  }
}

export const replaceDB = (db) => writeDB(db)

export const isValidDBWithRequiredTables = (db) => {
  if (!db || typeof db !== 'object') return false

  return REQUIRED_TABLES.every((tableName) => Array.isArray(db[tableName]))
}
