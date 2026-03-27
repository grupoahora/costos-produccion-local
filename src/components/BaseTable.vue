<script setup>
defineProps({
  columns: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  emptyText: { type: String, default: 'Sin registros' },
  showActions: { type: Boolean, default: true },
})

defineEmits(['edit', 'delete'])
</script>

<template>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key">{{ column.label }}</th>
          <th v-if="showActions">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="rows.length === 0">
          <td :colspan="columns.length + (showActions ? 1 : 0)">{{ emptyText }}</td>
        </tr>
        <tr v-for="row in rows" :key="row.id">
          <td v-for="column in columns" :key="`${row.id}-${column.key}`">
            {{ row[column.key] }}
          </td>
          <td v-if="showActions" class="actions">
            <button type="button" @click="$emit('edit', row)">Editar</button>
            <button type="button" class="danger" @click="$emit('delete', row)">Eliminar</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
