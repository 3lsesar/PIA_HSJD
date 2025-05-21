import { LLM_CONFIG, SYSTEM_PROMPT } from "./config"
import { RAGService } from "./rag-service"

export interface Message {
  role: "user" | "assistant" | "system"
  content: string
}

export class OllamaService {
  private static instance: OllamaService
  private endpoint: string

  private constructor() {
    this.endpoint = "/api/ollama"
  }

  public static getInstance(): OllamaService {
    if (!OllamaService.instance) {
      OllamaService.instance = new OllamaService()
    }
    return OllamaService.instance
  }

  async generateResponse(messages: Message[]): Promise<string> {
    try {
      console.log('[OllamaService] Enviant missatges a API:', messages)
      let body: any = {
        model: LLM_CONFIG.model,
        temperature: LLM_CONFIG.temperature,
        max_tokens: LLM_CONFIG.maxTokens,
        stream: false,
        keep_alive: -1,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages
        ]
      }

      // Si usamos RAG, enriquecemos el prompt con el contexto relevante
      if (LLM_CONFIG.useRAG) {
        const ragService = RAGService.getInstance()
        const context = await ragService.getRelevantContext(messages)
        const userMessage = messages[messages.length - 1]?.content || ''
        const prompt = context
          ? `Context rellevant:\n${context}\n\nPregunta de l'usuari:\n${userMessage}`
          : userMessage
        body.messages = [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ]
      }

      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[OllamaService] Error HTTP: ${response.status} - ${errorText}`)
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('[OllamaService] Resposta completa:', JSON.stringify(data, null, 2))
      
      // Verificamos la estructura de la respuesta
      if (!data || typeof data !== 'object') {
        console.error('[OllamaService] Resposta no és un objecte:', data)
        return '[Error] Format de resposta invàlid.'
      }

      // Intentamos acceder al contenido de diferentes maneras
      const content = data.message?.content || data.response || data.content
      
      if (!content) {
        console.error('[OllamaService] No s\'ha trobat el contingut en la resposta:', data)
        return '[Error] No s\'ha trobat el contingut en la resposta.'
      }

      return content.trim()
    } catch (error) {
      console.error("Error generating response:", error)
      return '[Error] No s\'ha pogut obtenir resposta del model.'
    }
  }
} 