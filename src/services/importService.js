import {
  REQUIRED_TABLES,
  createBaseDB,
  isValidDBWithRequiredTables,
  replaceDB,
} from './storageService'

export const importJSON = (fileText) => {
  if (typeof fileText !== 'string' || !fileText.trim()) {
    throw new Error('El archivo está vacío o no es texto válido.')
  }

  let parsed
  try {
    parsed = JSON.parse(fileText)
  } catch {
    throw new Error('JSON inválido: no se pudo parsear el contenido.')
  }

  if (!isValidDBWithRequiredTables(parsed)) {
    throw new Error(
      `Estructura inválida: faltan tablas obligatorias (${REQUIRED_TABLES.join(', ')}).`,
    )
  }

  const normalized = {
    ...createBaseDB(),
    ...parsed,
  }

  const saved = replaceDB(normalized)
  if (!saved) {
    throw new Error('No se pudo guardar la base importada en localStorage.')
  }

  return normalized
}
