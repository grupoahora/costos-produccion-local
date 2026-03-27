<script setup>
import { ref } from 'vue'
import { useAppStore } from '../stores/appStore'
import { exportExcel, exportJSON, exportSQL } from '../services/exportService'
import { importJSON } from '../services/importService'

const store = useAppStore()
const fileInput = ref(null)

const formatDate = () => new Date().toISOString().slice(0, 10)

const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const notifySuccess = (message) => {
  alert(message)
}

const notifyError = (message) => {
  alert(message)
}

const onExportJSON = () => {
  const filename = `app_db-${formatDate()}.json`
  downloadFile(exportJSON(store.app_db), filename, 'application/json')
  notifySuccess('Respaldo JSON exportado con éxito.')
}

const onExportExcel = () => {
  const filename = `app_db-${formatDate()}.xls`
  downloadFile(exportExcel(store.app_db), filename, 'application/vnd.ms-excel')
  notifySuccess('Respaldo Excel exportado con éxito.')
}

const onExportSQL = () => {
  const filename = `app_db-${formatDate()}.sql`
  downloadFile(exportSQL(store.app_db), filename, 'text/sql')
  notifySuccess('Respaldo SQL exportado con éxito.')
}

const onTriggerImport = () => {
  fileInput.value?.click()
}

const onImportJSON = (event) => {
  const [file] = event.target.files || []
  if (!file) return

  const confirmed = confirm('Esta acción reemplaza completamente app_db')
  if (!confirmed) {
    event.target.value = ''
    return
  }

  const reader = new FileReader()

  reader.onload = () => {
    try {
      const fileText = String(reader.result || '')
      importJSON(fileText)
      store.load()
      notifySuccess('Importación completada y estado actualizado.')
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'No se pudo importar el archivo JSON.')
    } finally {
      event.target.value = ''
    }
  }

  reader.onerror = () => {
    notifyError('No se pudo leer el archivo seleccionado.')
    event.target.value = ''
  }

  reader.readAsText(file)
}
</script>

<template>
  <section class="panel backup-panel">
    <h2>Respaldo de datos</h2>
    <p>
      Exporta una copia de <code>app_db</code> o importa un JSON para restaurar datos.
      La importación reemplaza completamente el contenido actual.
    </p>

    <div class="actions wrap">
      <button type="button" @click="onExportJSON">Exportar JSON</button>
      <button type="button" @click="onExportExcel">Exportar Excel</button>
      <button type="button" @click="onExportSQL">Exportar SQL</button>
      <button type="button" class="ghost" @click="onTriggerImport">Importar JSON</button>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept=".json,application/json"
      class="hidden-input"
      @change="onImportJSON"
    />
  </section>
</template>

<style scoped>
.backup-panel p {
  margin: 0;
}

.wrap {
  flex-wrap: wrap;
}

.hidden-input {
  display: none;
}
</style>
