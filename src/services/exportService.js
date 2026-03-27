import { REQUIRED_TABLES, createBaseDB } from './storageService'

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const normalizeDB = (db) => {
  const base = createBaseDB()
  if (!db || typeof db !== 'object') return base

  return {
    ...base,
    ...db,
  }
}

const getColumns = (rows) => {
  const set = new Set()
  rows.forEach((row) => {
    if (!row || typeof row !== 'object') return
    Object.keys(row).forEach((key) => set.add(key))
  })

  return Array.from(set)
}

const toSqlLiteral = (value) => {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
  if (typeof value === 'boolean') return value ? '1' : '0'

  const asText = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return `'${asText.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`
}

export const exportJSON = (db) => {
  const normalized = normalizeDB(db)
  return JSON.stringify(normalized, null, 2)
}

export const exportExcel = (db) => {
  const normalized = normalizeDB(db)

  const worksheetXml = REQUIRED_TABLES.map((tableName) => {
    const rows = Array.isArray(normalized[tableName]) ? normalized[tableName] : []
    const columns = getColumns(rows)

    const headerRow = columns.length
      ? `<Row>${columns
          .map((column) => `<Cell><Data ss:Type="String">${escapeXml(column)}</Data></Cell>`)
          .join('')}</Row>`
      : ''

    const dataRows = rows
      .map((row) => {
        const values = columns.map((column) => {
          const rawValue = row?.[column]
          const value = rawValue === undefined ? '' : rawValue
          const text = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)

          return `<Cell><Data ss:Type="String">${escapeXml(text)}</Data></Cell>`
        })

        return `<Row>${values.join('')}</Row>`
      })
      .join('')

    return `<Worksheet ss:Name="${escapeXml(tableName.slice(0, 31))}"><Table>${headerRow}${dataRows}</Table></Worksheet>`
  }).join('')

  return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
${worksheetXml}
</Workbook>`
}

export const exportSQL = (db) => {
  const normalized = normalizeDB(db)

  return REQUIRED_TABLES.flatMap((tableName) => {
    const rows = Array.isArray(normalized[tableName]) ? normalized[tableName] : []
    if (!rows.length) return [`-- ${tableName}: sin registros`]

    return rows.map((row) => {
      const columns = Object.keys(row || {})
      if (!columns.length) return `-- ${tableName}: registro vacío omitido`

      const columnSql = columns.map((column) => `\`${column}\``).join(', ')
      const valuesSql = columns.map((column) => toSqlLiteral(row[column])).join(', ')

      return `INSERT INTO \`${tableName}\` (${columnSql}) VALUES (${valuesSql});`
    })
  }).join('\n')
}
