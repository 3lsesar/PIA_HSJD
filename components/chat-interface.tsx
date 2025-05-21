"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { SendIcon, Loader2, ThumbsUp, ThumbsDown } from "lucide-react"
import { saveMessage, createConversation, updateMessageFeedback } from "@/lib/db"
import Image from "next/image"
import type { User } from "@/lib/auth"
import { OllamaService, type Message as LLMMessage } from "@/lib/llm/ollama-service"

type Message = {
  id?: number
  role: "user" | "assistant"
  content: string
  timestamp?: string
  feedback?: "positive" | "negative" | null
}

interface ChatInterfaceProps {
  user: User
}

export default function ChatInterface({ user }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const conversationId = useRef<number | null>(null)

  // Inicializa la conversación en la BBDD
  useEffect(() => {
    async function initConversation() {
      try {
        const result = await createConversation(user.id)
        conversationId.current = result.id
        setIsInitialized(true)
      } catch (err) {
        console.error("Error creando conversación:", err)
        setError("No se ha podido inicializar el chat. Por favor, recarga la página.")
      }
    }
    if (typeof window !== "undefined") {
      initConversation()
    }
  }, [user.id])

  // Scroll automático al final
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !isInitialized) return

    // 1) Añadimos el mensaje del usuario al estado
    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])
    const toSend = input
    setInput("")
    setIsLoading(true)

    // 2) Guardamos en la BBDD
    if (conversationId.current) {
      await saveMessage({
        conversationId: conversationId.current,
        role: "user",
        content: toSend,
      })
    }

    try {
      // 3) Preparamos el array para el LLM (solo user/assistant, sin system ni RAG aquí)
      const llmMessages: LLMMessage[] = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: toSend },
      ]

      // 4) Llamamos al servicio que ya inyecta SYSTEM_PROMPT, RAG, keep_alive…
      const assistantResponse = await OllamaService.getInstance().generateResponse(llmMessages)

      // 5) Añadimos la respuesta al estado
      const assistantMessage: Message = {
        role: "assistant",
        content: assistantResponse,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMessage])

      // 6) Guardamos la respuesta en la BBDD y actualizamos el ID
      if (conversationId.current) {
        const result = await saveMessage({
          conversationId: conversationId.current,
          role: "assistant",
          content: assistantResponse,
        })
        setMessages(prev =>
          prev.map((msg, i) =>
            i === prev.length - 1 ? { ...msg, id: result.id } : msg
          )
        )
      }
    } catch (err) {
      console.error("Error generando respuesta:", err)
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "Lo siento, ha habido un error al procesar tu solicitud. Por favor, intenta de nuevo más tarde.",
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFeedback = async (messageId: number | undefined, feedback: "positive" | "negative") => {
    if (!messageId) return
    try {
      setMessages(prev =>
        prev.map(msg => (msg.id === messageId ? { ...msg, feedback } : msg))
      )
      await updateMessageFeedback(messageId, feedback)
      console.log(`Feedback ${feedback} registrado para el mensaje ${messageId}`)
    } catch (err) {
      console.error("Error al guardar feedback:", err)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4">
        <div className="text-red-500 mb-4 bg-red-50 p-4 rounded-md border border-red-200">
          {error}
        </div>
        <Button onClick={() => window.location.reload()}>Recargar</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center max-w-md p-6 rounded-lg bg-gray-50 border border-dashed">
              <div className="flex justify-center mb-4">
                <Image src="/fixit-logo.png" alt="FixIT" width={80} height={80} />
              </div>
              <h3 className="font-medium text-lg mb-2">Bienvenido/a a FixIT</h3>
              <p className="text-gray-500 mb-4">
                ¡Hola {user.name}! Soy FixIT, el asistente técnico del Hospital Sant Joan de Déu. Estoy aquí para
                ayudarte con cualquier problema técnico que puedas tener.
              </p>
              <p className="text-sm text-gray-400">
                Puedes preguntarme sobre problemas con ordenadores, impresoras, red, correo electrónico, software o
                cualquier otro tema relacionado con la tecnología en el hospital.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <Card
                key={index}
                className={`p-4 ${
                  message.role === "user"
                    ? "bg-primary/5 ml-12 border-primary/10"
                    : "bg-[#0A0A6F]/5 mr-12 border-[#0A0A6F]/10"
                }`}
              >
                <div className="flex items-start gap-3">
                  {message.role === "user" ? (
                    <Avatar className="h-8 w-8">
                      <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
                        {user.name.charAt(0)}
                      </div>
                    </Avatar>
                  ) : (
                    <Avatar className="h-8 w-8">
                      <div className="h-8 w-8 rounded-full overflow-hidden">
                        <Image src="/fixit-logo.png" alt="FixIT" width={32} height={32} />
                      </div>
                    </Avatar>
                  )}
                  <div className="flex-1">
                    <div className="font-medium mb-1">
                      {message.role === "user" ? "Tú" : "FixIT"}
                    </div>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    {message.role === "assistant" && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="text-xs text-gray-500 mr-2">
                          ¿Te ha sido útil esta respuesta?
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`p-1 h-8 w-8 rounded-full ${message.feedback === "positive" ? "bg-green-100 text-green-600 border-green-300" : ""}`}
                          onClick={() => handleFeedback(message.id, "positive")}
                          disabled={message.feedback !== undefined}
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`p-1 h-8 w-8 rounded-full ${message.feedback === "negative" ? "bg-red-100 text-red-600 border-red-300" : ""}`}
                          onClick={() => handleFeedback(message.id, "negative")}
                          disabled={message.feedback !== undefined}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                        {message.feedback && (
                          <span className="text-xs text-gray-500 ml-2">
                            {message.feedback === "positive"
                              ? "¡Gracias por tu feedback positivo!"
                              : "Gracias por tu feedback. Intentaremos mejorar."}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>
      <div className="p-4 border-t bg-gray-50">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Escribe tu consulta técnica aquí..."
            className="flex-1 min-h-[80px] resize-none bg-white"
            disabled={!isInitialized || isLoading}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <Button type="submit" disabled={!isInitialized || isLoading || !input.trim()} className="self-end">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendIcon className="h-5 w-5" />}
          </Button>
        </form>
      </div>
    </div>
  )
}
