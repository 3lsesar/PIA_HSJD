import { NextRequest, NextResponse } from 'next/server'
import { LLM_CONFIG, SYSTEM_PROMPT } from '@/lib/llm/config'
import { RAGService } from '@/lib/llm/rag-service'
// Importamos la interfaz de mensajes de tu servicio Ollama
import type { Message as LLMMessage } from '@/lib/llm/ollama-service'

interface IncomingMessage {
  role: string
  content: string
}

export async function POST(req: NextRequest) {
  try {
    // Leemos el array de mensajes del body
    const { messages: incoming } = await req.json() as { messages: IncomingMessage[] }
    console.log('[API] Missatges rebuts:', incoming)

    // Validamos que haya mensajes
    if (!incoming || !Array.isArray(incoming) || incoming.length === 0) {
      return NextResponse.json({ error: 'No se han recibido mensajes' }, { status: 400 })
    }

    // Filtramos cualquier mensaje 'system' que venga del cliente
    const convoRaw = incoming.filter(m => m.role !== 'system')

    // Convertimos al tipo LLMMessage (asegurándonos de castear sólo los valores válidos)
    const convo: LLMMessage[] = convoRaw.map(m => {
      // Opcional: podrías validar que m.role sea uno de los valores permitidos
      const role = (['user','assistant','system'] as const).includes(m.role as any)
        ? m.role as 'user'|'assistant'|'system'
        : 'user'
      return { role, content: m.content }
    })

    // Construimos el payload base
    const payload: any = {
      model: LLM_CONFIG.model,
      temperature: LLM_CONFIG.temperature,
      max_tokens: LLM_CONFIG.maxTokens,
      stream: false,
      keep_alive: -1,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...convo
      ]
    }

    // Si usamos RAG, enriquecemos el prompt con el contexto relevante
    if (LLM_CONFIG.useRAG) {
      const rag = RAGService.getInstance()
      const context = await rag.getRelevantContext(convo)
      const last = convo[convo.length - 1]?.content || ''
      const enriched = context
        ? `Contexto relevante:\n${context}\n\nPregunta del usuario:\n${last}`
        : last

      payload.messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: enriched }
      ]
    }

    console.log('[API] Enviant a Ollama:', payload)
    const ollamaRes = await fetch(LLM_CONFIG.ollamaEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!ollamaRes.ok) {
      const errorText = await ollamaRes.text()
      console.error('[API] Error d\'Ollama:', errorText)
      return NextResponse.json({ error: `Ollama error: ${errorText}` }, { status: 500 })
    }

    const data = await ollamaRes.json()
    console.log('[API] Resposta d\'Ollama:', data)

    // Verificamos que la respuesta tenga el formato esperado
    if (!data.message?.content) {
      console.error('[API] Format de resposta inesperat:', data)
      return NextResponse.json({ error: 'Format de resposta inesperat d\'Ollama' }, { status: 500 })
    }

    return NextResponse.json({ response: data.message.content.trim() })
  } catch (e: any) {
    console.error('[API] Error general:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
