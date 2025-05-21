// Función para solicitar persistencia de almacenamiento
async function requestStoragePersistence(): Promise<boolean> {
  try {
    // Comprobamos si el navegador soporta la API de persistencia
    if (navigator.storage && navigator.storage.persist) {
      // Solicitamos persistencia
      const isPersisted = await navigator.storage.persist()
      console.log(`Persistencia de almacenamiento ${isPersisted ? "concedida" : "denegada"}`)
      return isPersisted
    }
    return false
  } catch (error) {
    console.error("Error al solicitar persistencia:", error)
    return false
  }
}

// Tipos para nuestros datos
type Conversation = {
  id?: number
  user_id: string // Añadimos el ID de usuario
  created_at: string
}

type Message = {
  id?: number
  conversation_id: number
  role: "user" | "assistant"
  content: string
  created_at: string
  feedback?: "positive" | "negative" | null
}

// Función para abrir la base de datos
function openDatabase(): Promise<IDBDatabase> {
  return new Promise(async (resolve, reject) => {
    // Solicitamos persistencia antes de abrir la base de datos
    await requestStoragePersistence()

    // Abrimos la base de datos
    const request = indexedDB.open("chatbot-db", 2) // Incrementamos la versión para actualizar el esquema

    // Si la base de datos no existe o necesita actualizarse
    request.onupgradeneeded = (event) => {
      const db = request.result
      const oldVersion = event.oldVersion

      // Creamos las tablas si no existen
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains("conversations")) {
          const conversationStore = db.createObjectStore("conversations", { keyPath: "id", autoIncrement: true })
          conversationStore.createIndex("by-date", "created_at", { unique: false })
        }

        if (!db.objectStoreNames.contains("messages")) {
          const messageStore = db.createObjectStore("messages", { keyPath: "id", autoIncrement: true })
          messageStore.createIndex("by-conversation", "conversation_id", { unique: false })
        }
      }

      // Actualizamos el esquema si venimos de una versión anterior
      if (oldVersion < 2) {
        // Añadimos el índice por usuario a las conversaciones
        const conversationStore = request.transaction.objectStore("conversations")
        if (!conversationStore.indexNames.contains("by-user")) {
          conversationStore.createIndex("by-user", "user_id", { unique: false })
        }
      }
    }

    // Si hay un error
    request.onerror = (event) => {
      console.error("Error opening database:", request.error)
      reject(request.error)
    }

    // Si se ha abierto correctamente
    request.onsuccess = (event) => {
      resolve(request.result)
    }
  })
}

// Función para crear una nueva conversación
export async function createConversation(userId: string): Promise<{ id: number }> {
  try {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["conversations"], "readwrite")
      const store = transaction.objectStore("conversations")

      const conversation: Conversation = {
        user_id: userId, // Asociamos la conversación con el usuario
        created_at: new Date().toISOString(),
      }

      const request = store.add(conversation)

      request.onsuccess = () => {
        resolve({ id: request.result as number })
      }

      request.onerror = () => {
        console.error("Error creating conversation:", request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error("Error in createConversation:", error)
    throw error
  }
}

// Función para guardar un mensaje
export async function saveMessage({
  conversationId,
  role,
  content,
  feedback = null,
}: {
  conversationId: number
  role: "user" | "assistant"
  content: string
  feedback?: "positive" | "negative" | null
}): Promise<{ id: number }> {
  try {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["messages"], "readwrite")
      const store = transaction.objectStore("messages")

      const message: Message = {
        conversation_id: conversationId,
        role,
        content,
        created_at: new Date().toISOString(),
        feedback,
      }

      const request = store.add(message)

      request.onsuccess = () => {
        resolve({ id: request.result as number })
      }

      request.onerror = () => {
        console.error("Error saving message:", request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error("Error in saveMessage:", error)
    throw error
  }
}

// Función para actualizar el feedback de un mensaje
export async function updateMessageFeedback(messageId: number, feedback: "positive" | "negative"): Promise<boolean> {
  try {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["messages"], "readwrite")
      const store = transaction.objectStore("messages")

      // Primero obtenemos el mensaje
      const getRequest = store.get(messageId)

      getRequest.onsuccess = () => {
        if (!getRequest.result) {
          resolve(false)
          return
        }

        // Actualizamos el feedback
        const message = getRequest.result
        message.feedback = feedback

        // Guardamos el mensaje actualizado
        const updateRequest = store.put(message)

        updateRequest.onsuccess = () => {
          resolve(true)
        }

        updateRequest.onerror = () => {
          console.error("Error updating message feedback:", updateRequest.error)
          reject(updateRequest.error)
        }
      }

      getRequest.onerror = () => {
        console.error("Error getting message:", getRequest.error)
        reject(getRequest.error)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error("Error in updateMessageFeedback:", error)
    return false
  }
}

// Función para obtener las conversaciones de un usuario específico
export async function getConversationsByUserId(userId: string): Promise<any[]> {
  try {
    const db = await openDatabase()

    // Obtenemos las conversaciones del usuario
    const conversations = await new Promise<Conversation[]>((resolve, reject) => {
      const transaction = db.transaction(["conversations"], "readonly")
      const store = transaction.objectStore("conversations")
      const index = store.index("by-user")

      const request = index.getAll(IDBKeyRange.only(userId))

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        console.error("Error getting conversations:", request.error)
        reject(request.error)
      }
    })

    // Después obtenemos los mensajes para cada conversación
    const result = await Promise.all(
      conversations.map(async (conversation) => {
        const messages = await new Promise<Message[]>((resolve, reject) => {
          const transaction = db.transaction(["messages"], "readonly")
          const store = transaction.objectStore("messages")
          const index = store.index("by-conversation")

          const request = index.getAll(IDBKeyRange.only(conversation.id))

          request.onsuccess = () => {
            resolve(request.result)
          }

          request.onerror = () => {
            console.error("Error getting messages:", request.error)
            reject(request.error)
          }
        })

        return {
          ...conversation,
          messages,
        }
      }),
    )

    db.close()

    // Ordenamos las conversaciones por fecha (más reciente primero)
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } catch (error) {
    console.error("Error in getConversationsByUserId:", error)
    return []
  }
}

// Función para obtener todas las conversaciones (mantenemos por compatibilidad)
export async function getConversations(): Promise<any[]> {
  try {
    const db = await openDatabase()

    // Primero obtenemos todas las conversaciones
    const conversations = await new Promise<Conversation[]>((resolve, reject) => {
      const transaction = db.transaction(["conversations"], "readonly")
      const store = transaction.objectStore("conversations")
      const index = store.index("by-date")

      const request = index.getAll()

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        console.error("Error getting conversations:", request.error)
        reject(request.error)
      }
    })

    // Después obtenemos los mensajes para cada conversación
    const result = await Promise.all(
      conversations.map(async (conversation) => {
        const messages = await new Promise<Message[]>((resolve, reject) => {
          const transaction = db.transaction(["messages"], "readonly")
          const store = transaction.objectStore("messages")
          const index = store.index("by-conversation")

          const request = index.getAll(IDBKeyRange.only(conversation.id))

          request.onsuccess = () => {
            resolve(request.result)
          }

          request.onerror = () => {
            console.error("Error getting messages:", request.error)
            reject(request.error)
          }
        })

        return {
          ...conversation,
          messages,
        }
      }),
    )

    db.close()

    // Ordenamos las conversaciones por fecha (más reciente primero)
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } catch (error) {
    console.error("Error in getConversations:", error)
    return []
  }
}

// Función para obtener una conversación específica
export async function getConversation(id: number): Promise<any> {
  try {
    const db = await openDatabase()

    // Obtenemos la conversación
    const conversation = await new Promise<Conversation | undefined>((resolve, reject) => {
      const transaction = db.transaction(["conversations"], "readonly")
      const store = transaction.objectStore("conversations")

      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        console.error("Error getting conversation:", request.error)
        reject(request.error)
      }
    })

    if (!conversation) {
      db.close()
      return null
    }

    // Obtenemos los mensajes de la conversación
    const messages = await new Promise<Message[]>((resolve, reject) => {
      const transaction = db.transaction(["messages"], "readonly")
      const store = transaction.objectStore("messages")
      const index = store.index("by-conversation")

      const request = index.getAll(IDBKeyRange.only(id))

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        console.error("Error getting messages:", request.error)
        reject(request.error)
      }
    })

    db.close()

    // Ordenamos los mensajes por fecha
    return {
      ...conversation,
      messages: messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    }
  } catch (error) {
    console.error("Error in getConversation:", error)
    return null
  }
}
