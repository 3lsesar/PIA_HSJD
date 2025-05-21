import { LLM_CONFIG } from "./config"
import { Message } from "./ollama-service"

export class RAGService {
  private static instance: RAGService
  private isInitialized: boolean = false

  private constructor() {}

  public static getInstance(): RAGService {
    if (!RAGService.instance) {
      RAGService.instance = new RAGService()
    }
    return RAGService.instance
  }

  async getRelevantContext(messages: Message[]): Promise<string> {
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== "user") return ""

    try {
      const response = await fetch('/api/rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: lastMessage.content }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.context || ""
    } catch (error) {
      console.error('Error getting relevant context:', error)
      return ""
    }
  }
} 