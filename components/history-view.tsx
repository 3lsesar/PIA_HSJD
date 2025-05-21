"use client"

import type React from "react"
import { ThumbsUp, ThumbsDown } from "lucide-react"

import { useState, useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Search, RefreshCw, Calendar, MessageSquare, SendIcon, PlusCircle, ArrowLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/utils"
import { getConversationsByUserId, getConversation, saveMessage, createConversation } from "@/lib/db"
import Image from "next/image"
import type { User } from "@/lib/auth"

type Message = {
  id: number
  conversation_id: number
  role: "user" | "assistant"
  content: string
  created_at: string
  feedback?: "positive" | "negative"
}

type Conversation = {
  id: number
  user_id: string
  created_at: string
  messages: Message[]
}

interface HistoryViewProps {
  user: User
}

export default function HistoryView({ user }: HistoryViewProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchConversations = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Obtenemos solo las conversaciones del usuario actual
      const data = await getConversationsByUserId(user.id)
      setConversations(data)
    } catch (error) {
      console.error("Error fetching conversations:", error)
      setError("No se han podido cargar las conversaciones. Por favor, recarga la página.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Solo cargamos las conversaciones si estamos en el cliente
    if (typeof window !== "undefined") {
      fetchConversations()
    }
  }, [user.id])

  // Scroll al final cuando se añaden nuevos mensajes
  useEffect(() => {
    if (selectedConversation) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [selectedConversation, selectedConversation?.messages?.length])

  const filteredConversations = conversations.filter((conversation) => {
    const hasMatchingMessage = conversation.messages.some((message) =>
      message.content.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    return hasMatchingMessage
  })

  const handleConversationClick = async (conversation: Conversation) => {
    try {
      // Si estamos creando una nueva conversación, cancelamos ese modo
      if (isCreatingNew) {
        setIsCreatingNew(false)
      }

      const data = await getConversation(conversation.id)
      if (data) {
        setSelectedConversation(data)
        setNewMessage("") // Limpiamos el campo de mensaje al cambiar de conversación
      }
    } catch (error) {
      console.error("Error fetching conversation details:", error)
    }
  }

  // Función para crear una nueva conversación
  const handleCreateNewConversation = async () => {
    try {
      setIsCreatingNew(true)
      setSelectedConversation(null)
      setNewMessage("")
    } catch (error) {
      console.error("Error creating new conversation:", error)
      setError("No se ha podido crear una nueva conversación. Por favor, inténtalo de nuevo.")
    }
  }

  // Función para simular la respuesta del chatbot
  const simulateAIResponse = async (message: string): Promise<string> => {
    // Simulamos un tiempo de respuesta
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Respuestas específicas para consultas técnicas
    const lowerMessage = message.toLowerCase()

    if (
      lowerMessage.includes("hola") ||
      lowerMessage.includes("buenos días") ||
      lowerMessage.includes("buenas tardes")
    ) {
      return `¡Hola ${user.name}! Soy FixIT, el asistente técnico del Hospital Sant Joan de Déu. ¿En qué puedo ayudarte hoy?`
    }

    if (lowerMessage.includes("gracias")) {
      return "¡De nada! Estoy aquí para ayudarte con cualquier problema técnico. No dudes en contactarme si necesitas más ayuda."
    }

    if (lowerMessage.includes("adiós") || lowerMessage.includes("hasta luego")) {
      return `¡Adiós ${user.name}! Si tienes más problemas técnicos, no dudes en volver a contactar conmigo. ¡Que tengas un buen día!`
    }

    if (lowerMessage.includes("contraseña") || lowerMessage.includes("password")) {
      return "Para restablecer tu contraseña, debes acceder al portal de usuarios en https://portal.sjd.es y hacer clic en 'He olvidado mi contraseña'. Si sigues teniendo problemas, contacta con el departamento de TI en el teléfono interno 5555."
    }

    if (lowerMessage.includes("wifi") || lowerMessage.includes("red") || lowerMessage.includes("internet")) {
      return "Para conectarte a la red WiFi del hospital, selecciona la red 'SJD-Staff' e introduce tus credenciales corporativas. Si no puedes conectarte, comprueba que tu dispositivo tenga el WiFi activado y estés dentro del área de cobertura. Si el problema persiste, contacta con el departamento de TI."
    }

    if (lowerMessage.includes("impresora") || lowerMessage.includes("imprimir")) {
      return "Si tienes problemas con la impresora, comprueba que esté encendida, conectada a la red y con papel. Para añadir una nueva impresora, ve a 'Configuración > Impresoras > Añadir impresora' y selecciona la impresora de la lista. Si necesitas más ayuda, proporciona el modelo de la impresora y el error específico que estás experimentando."
    }

    if (lowerMessage.includes("ordenador") || lowerMessage.includes("pc") || lowerMessage.includes("lento")) {
      return "Si tu ordenador va lento, prueba a reiniciarlo. También puedes comprobar qué aplicaciones están consumiendo más recursos a través del Administrador de Tareas (Ctrl+Alt+Supr). Asegúrate de tener el antivirus actualizado y de no tener demasiados programas abiertos simultáneamente. Si el problema persiste, contacta con el departamento de TI para una revisión."
    }

    if (lowerMessage.includes("correo") || lowerMessage.includes("email") || lowerMessage.includes("outlook")) {
      return "Para problemas con el correo electrónico, comprueba tu conexión a internet, asegúrate de que tu buzón no esté lleno y verifica que tus credenciales sean correctas. Si no puedes enviar o recibir correos, contacta con el departamento de TI proporcionando el error específico que estás experimentando."
    }

    if (lowerMessage.includes("software") || lowerMessage.includes("programa") || lowerMessage.includes("aplicación")) {
      return "Para instalar nuevo software, debes hacer una solicitud a través del portal de TI en https://ti.sjd.es. Recuerda que solo se puede instalar software autorizado por el hospital. Si necesitas un programa específico para tu trabajo, incluye una justificación en tu solicitud."
    }

    if (lowerMessage.includes("virus") || lowerMessage.includes("malware") || lowerMessage.includes("seguridad")) {
      return "Si sospechas que tu ordenador tiene un virus, desconéctalo de la red inmediatamente y contacta con el departamento de TI. No abras correos sospechosos ni hagas clic en enlaces desconocidos. Recuerda que el hospital dispone de un sistema antivirus que se actualiza automáticamente."
    }

    if (lowerMessage.includes("ayuda") || lowerMessage.includes("soporte") || lowerMessage.includes("asistencia")) {
      return "Estoy aquí para ayudarte con cualquier problema técnico. Puedes preguntarme sobre problemas con ordenadores, impresoras, red, correo electrónico, software o cualquier otro tema relacionado con la tecnología en el hospital. Si necesitas asistencia presencial, contacta con el departamento de TI en el teléfono interno 5555."
    }

    // Respuesta por defecto
    return `He recibido tu consulta técnica sobre "${message}". Para proporcionarte la mejor ayuda posible, necesito más detalles sobre el problema que estás experimentando. ¿Puedes describirlo con más detalle? ¿Qué pasos has seguido hasta ahora? ¿Has recibido algún mensaje de error específico?`
  }

  // Función para enviar un nuevo mensaje
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || isSending) return

    setIsSending(true)

    try {
      // Si estamos creando una nueva conversación
      if (isCreatingNew) {
        // Creamos una nueva conversación
        const result = await createConversation(user.id)
        const conversationId = result.id

        // Guardamos el mensaje del usuario
        await saveMessage({
          conversationId,
          role: "user",
          content: newMessage,
        })

        // Simulamos la respuesta del asistente
        const assistantResponse = await simulateAIResponse(newMessage)

        // Guardamos la respuesta del asistente
        await saveMessage({
          conversationId,
          role: "assistant",
          content: assistantResponse,
        })

        // Obtenemos la conversación recién creada
        const newConversation = await getConversation(conversationId)
        // La añadimos al principio de la lista local sin recargar todo
        setConversations((prevConversations) => [newConversation, ...prevConversations])
        setSelectedConversation(newConversation)
        setIsCreatingNew(false)
      }
      // Si estamos continuando una conversación existente
      else if (selectedConversation) {
        // Creamos una copia de la conversación actual para actualizarla localmente
        const updatedConversation = { ...selectedConversation }

        // Añadimos el mensaje del usuario
        const userMessage = {
          id: Date.now(), // ID temporal
          conversation_id: selectedConversation.id,
          role: "user" as const,
          content: newMessage,
          created_at: new Date().toISOString(),
        }

        // Actualizamos la UI inmediatamente
        updatedConversation.messages = [...updatedConversation.messages, userMessage]
        setSelectedConversation(updatedConversation)

        // Guardamos el mensaje en la base de datos
        await saveMessage({
          conversationId: selectedConversation.id,
          role: "user",
          content: newMessage,
        })

        // Simulamos la respuesta del asistente
        const assistantResponse = await simulateAIResponse(newMessage)

        // Añadimos la respuesta del asistente
        const assistantMessage = {
          id: Date.now() + 1, // ID temporal
          conversation_id: selectedConversation.id,
          role: "assistant" as const,
          content: assistantResponse,
          created_at: new Date().toISOString(),
        }

        // Actualizamos la UI con la respuesta
        updatedConversation.messages = [...updatedConversation.messages, assistantMessage]
        setSelectedConversation(updatedConversation)

        // Guardamos la respuesta en la base de datos
        await saveMessage({
          conversationId: selectedConversation.id,
          role: "assistant",
          content: assistantResponse,
        })

        // Actualizamos la conversación en la lista local sin recargar todo
        const updatedConversations = conversations.map((conv) =>
          conv.id === selectedConversation.id ? { ...conv, messages: updatedConversation.messages } : conv,
        )
        setConversations(updatedConversations)
      }

      // Limpiamos el campo de mensaje
      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
      setError("Ha ocurrido un error al enviar el mensaje. Por favor, inténtalo de nuevo.")
    } finally {
      setIsSending(false)
    }
  }

  // Si hay un error, mostramos un mensaje de error
  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4">
        <div className="text-red-500 mb-4 bg-red-50 p-4 rounded-md border border-red-200">{error}</div>
        <Button onClick={() => fetchConversations()}>Volver a intentar</Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
      <div className="md:col-span-1 border-r">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center gap-2 mb-4">
            <Input
              placeholder="Buscar en el historial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-white"
            />
            <Button variant="outline" size="icon" onClick={fetchConversations} title="Actualizar historial">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">{filteredConversations.length} conversaciones</div>
            <Button variant="outline" size="sm" onClick={handleCreateNewConversation} className="text-xs">
              <PlusCircle className="h-3 w-3 mr-1" />
              Nueva conversación
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[calc(70vh-120px)]">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredConversations.length === 0 && !searchTerm ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="space-y-2">
                <MessageSquare className="h-8 w-8 mx-auto text-gray-300" />
                <p>No hay conversaciones</p>
                <p className="text-sm">Tus conversaciones con FixIT aparecerán aquí</p>
                <Button variant="outline" size="sm" onClick={handleCreateNewConversation} className="mt-4">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Iniciar nueva conversación
                </Button>
              </div>
            </div>
          ) : filteredConversations.length === 0 && searchTerm ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="space-y-2">
                <Search className="h-8 w-8 mx-auto text-gray-300" />
                <p>No se han encontrado conversaciones con &quot;{searchTerm}&quot;</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1 p-1">
              {filteredConversations.map((conversation) => (
                <Button
                  key={conversation.id}
                  variant="ghost"
                  className={`w-full justify-start text-left p-3 ${
                    selectedConversation?.id === conversation.id ? "bg-primary/10 border-l-2 border-primary" : ""
                  }`}
                  onClick={() => handleConversationClick(conversation)}
                >
                  <div className="truncate w-full">
                    <div className="font-medium truncate">
                      {conversation.messages[0]?.content.substring(0, 30) || "Conversación vacía"}
                      {conversation.messages[0]?.content.length > 30 ? "..." : ""}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(conversation.created_at)} ·
                      <MessageSquare className="h-3 w-3 ml-1" />
                      {conversation.messages.length} mensajes
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="md:col-span-2 flex flex-col h-full">
        {isCreatingNew ? (
          <>
            <div className="p-4 border-b bg-gray-50 sticky top-0 z-10 flex justify-between items-center">
              <h3 className="font-medium">Nueva conversación</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsCreatingNew(false)} className="text-xs">
                <ArrowLeft className="h-3 w-3 mr-1" />
                Volver
              </Button>
            </div>

            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center max-w-md">
                <div className="flex justify-center mb-4">
                  <Image src="/fixit-logo.png" alt="FixIT" width={80} height={80} />
                </div>
                <h3 className="text-lg font-medium mb-2">Inicia una nueva conversación</h3>
                <p className="text-sm text-gray-500 mb-6">
                  ¿En qué puedo ayudarte hoy? Escribe tu consulta técnica y te responderé lo antes posible.
                </p>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 mt-auto">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe tu consulta técnica aquí..."
                  className="flex-1 min-h-[80px] resize-none bg-white"
                  disabled={isSending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage(e)
                    }
                  }}
                />
                <Button type="submit" disabled={isSending || !newMessage.trim()} className="self-end">
                  {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendIcon className="h-5 w-5" />}
                </Button>
              </form>
            </div>
          </>
        ) : selectedConversation ? (
          <>
            <div className="p-4 border-b bg-gray-50 sticky top-0 z-10 flex justify-between items-center">
              <div>
                <h3 className="font-medium">Conversación del {formatDate(selectedConversation.created_at)}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {selectedConversation.messages.length} mensajes
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleCreateNewConversation} className="text-xs">
                <PlusCircle className="h-3 w-3 mr-1" />
                Nueva conversación
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {selectedConversation.messages.map((message) => (
                  <Card
                    key={message.id}
                    className={`border-l-4 ${message.role === "user" ? "border-l-primary" : "border-l-[#0A0A6F]"}`}
                  >
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {message.role === "user" ? (
                            <span className="text-primary">{user.name}</span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <div className="h-5 w-5 rounded-full overflow-hidden">
                                <Image src="/fixit-logo.png" alt="FixIT" width={20} height={20} />
                              </div>
                              <span className="text-[#0A0A6F]">FixIT</span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(message.created_at, true)}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 pb-3">
                      <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                      {/* Mostrar el feedback si existe */}
                      {message.role === "assistant" && message.feedback && (
                        <div className="mt-2 flex items-center text-xs text-gray-500">
                          <span className="mr-2">Feedback:</span>
                          {message.feedback === "positive" ? (
                            <span className="flex items-center text-green-600">
                              <ThumbsUp className="h-3 w-3 mr-1" /> Útil
                            </span>
                          ) : (
                            <span className="flex items-center text-red-600">
                              <ThumbsDown className="h-3 w-3 mr-1" /> No útil
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Formulario para enviar nuevos mensajes */}
            <div className="p-4 border-t bg-gray-50 mt-auto">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe tu consulta técnica aquí..."
                  className="flex-1 min-h-[80px] resize-none bg-white"
                  disabled={isSending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage(e)
                    }
                  }}
                />
                <Button type="submit" disabled={isSending || !newMessage.trim()} className="self-end">
                  {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendIcon className="h-5 w-5" />}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center max-w-md">
              <div className="flex justify-center mb-4">
                <Image src="/fixit-logo.png" alt="FixIT" width={60} height={60} />
              </div>
              <h3 className="text-lg font-medium mb-2">Selecciona o inicia una conversación</h3>
              <p className="text-sm text-gray-500 mb-4">
                Selecciona una conversación del historial para ver los detalles o inicia una nueva conversación.
              </p>
              <Button variant="outline" onClick={handleCreateNewConversation}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Iniciar nueva conversación
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
