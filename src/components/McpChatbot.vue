<script setup>
import { nextTick, ref } from 'vue'
import { createMcpChatAssistant } from '../services/mcpChatService'
import { useAppStore } from '../stores/appStore'

const props = defineProps({
  activeTab: {
    type: String,
    default: 'dashboard',
  },
})

const emit = defineEmits(['navigate'])
const store = useAppStore()
const isOpen = ref(false)
const input = ref('')
const messagesRef = ref(null)
const messages = ref([
  {
    id: 1,
    role: 'assistant',
    tool: 'mcp.chat',
    text: 'Hola, soy tu asistente MCP local. Puedo consultar datos y ejecutar acciones como crear productos, registrar gastos, ventas o produccion.',
  },
])

const assistant = createMcpChatAssistant({
  store,
  navigate: (tab) => emit('navigate', tab),
})

const scrollToBottom = async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

const pushMessage = (role, text, tool = '') => {
  messages.value.push({
    id: Date.now() + Math.random(),
    role,
    text,
    tool,
  })
}

const sendMessage = async () => {
  const text = input.value.trim()
  if (!text) return

  pushMessage('user', text)
  input.value = ''

  const result = assistant.handleMessage(text)
  pushMessage('assistant', result.response, result.tool)

  await scrollToBottom()
}

const sendSuggestion = (text) => {
  input.value = text
  sendMessage()
}
</script>

<template>
  <div class="mcp-chatbot" :class="{ open: isOpen }">
    <button type="button" class="mcp-chatbot__launcher" @click="isOpen = !isOpen">
      <span>MCP</span>
      <strong>{{ isOpen ? 'Cerrar asistente' : 'Asistente' }}</strong>
    </button>

    <section v-if="isOpen" class="mcp-chatbot__panel" aria-label="Chatbot MCP">
      <header class="mcp-chatbot__header">
        <div>
          <p>Chat MCP local</p>
          <strong>Acciones con lenguaje natural</strong>
        </div>
        <small>Seccion: {{ props.activeTab }}</small>
      </header>

      <div ref="messagesRef" class="mcp-chatbot__messages">
        <article
          v-for="message in messages"
          :key="message.id"
          :class="['mcp-message', `mcp-message--${message.role}`]"
        >
          <small v-if="message.tool">{{ message.tool }}</small>
          <p>{{ message.text }}</p>
        </article>
      </div>

      <div class="mcp-chatbot__suggestions">
        <button type="button" @click="sendSuggestion('resumen del dashboard')">
          Resumen
        </button>
        <button type="button" @click="sendSuggestion('consulta inventario')">
          Inventario
        </button>
        <button type="button" @click="sendSuggestion('abre ventas')">
          Ir a ventas
        </button>
      </div>

      <form class="mcp-chatbot__form" @submit.prevent="sendMessage">
        <input
          v-model="input"
          type="text"
          placeholder="Ej: registra gasto Luz por 50000"
          autocomplete="off"
        />
        <button type="submit" class="primary-action">Enviar</button>
      </form>
    </section>
  </div>
</template>
