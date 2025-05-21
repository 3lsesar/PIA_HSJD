import type { User } from "./auth"

// Usuarios de demostración
const demoUsers: User[] = [
  { id: "user1", name: "Juan García", role: "Médico/a", department: "Pediatría", avatar: "JG", password: "123456" },
  { id: "user2", name: "María López", role: "Enfermero/a", department: "Urgencias", avatar: "ML", password: "123456" },
  {
    id: "user3",
    name: "Pablo Martín",
    role: "Administrativo/a",
    department: "Recepción",
    avatar: "PM",
    password: "123456",
  },
]

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

// Función para inicializar la base de datos de usuarios
export async function initUserDatabase(): Promise<void> {
  // Solicitamos persistencia de almacenamiento
  await requestStoragePersistence()

  return new Promise((resolve, reject) => {
    const request = indexedDB.open("users-db", 1)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains("users")) {
        const userStore = db.createObjectStore("users", { keyPath: "id" })
        userStore.createIndex("by-name", "name", { unique: false })
      }
    }

    request.onerror = () => {
      reject(request.error)
    }

    request.onsuccess = async () => {
      const db = request.result

      // Comprobamos si ya hay usuarios
      const tx = db.transaction("users", "readonly")
      const store = tx.objectStore("users")
      const countRequest = store.count()

      countRequest.onsuccess = () => {
        if (countRequest.result === 0) {
          // Si no hay usuarios, añadimos los usuarios de demostración
          const writeTx = db.transaction("users", "readwrite")
          const writeStore = writeTx.objectStore("users")

          demoUsers.forEach((user) => {
            writeStore.add(user)
          })

          writeTx.oncomplete = () => {
            db.close()
            resolve()
          }

          writeTx.onerror = () => {
            db.close()
            reject(writeTx.error)
          }
        } else {
          // Si ya hay usuarios, no hacemos nada
          db.close()
          resolve()
        }
      }

      countRequest.onerror = () => {
        db.close()
        reject(countRequest.error)
      }
    }
  })
}

// Funció per exportar totes les dades (usuaris i converses)
export async function exportAllData(): Promise<string> {
  try {
    // Obrim les bases de dades
    const usersDB = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("users-db", 1)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    const chatDB = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("chatbot-db", 2)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    // Obtenim els usuaris
    const users = await new Promise<User[]>((resolve, reject) => {
      const transaction = usersDB.transaction(["users"], "readonly")
      const store = transaction.objectStore("users")
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    // Obtenim les converses
    const conversations = await new Promise<any[]>((resolve, reject) => {
      const transaction = chatDB.transaction(["conversations"], "readonly")
      const store = transaction.objectStore("conversations")
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    // Obtenim els missatges
    const messages = await new Promise<any[]>((resolve, reject) => {
      const transaction = chatDB.transaction(["messages"], "readonly")
      const store = transaction.objectStore("messages")
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    // Tanquem les bases de dades
    usersDB.close()
    chatDB.close()

    // Creem l'objecte de dades
    const exportData = {
      users,
      conversations,
      messages,
      exportDate: new Date().toISOString(),
    }

    // Convertim a JSON i retornem
    return JSON.stringify(exportData)
  } catch (error) {
    console.error("Error en exportar dades:", error)
    throw error
  }
}

// Funció per importar totes les dades
export async function importAllData(jsonData: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonData)

    if (!data.users || !data.conversations || !data.messages) {
      throw new Error("Format de dades invàlid")
    }

    // Obrim les bases de dades
    const usersDB = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("users-db", 1)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    const chatDB = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("chatbot-db", 2)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    // Netegem i importem usuaris
    await new Promise<void>((resolve, reject) => {
      const transaction = usersDB.transaction(["users"], "readwrite")
      const store = transaction.objectStore("users")

      const clearRequest = store.clear()
      clearRequest.onsuccess = () => {
        data.users.forEach((user: User) => {
          store.add(user)
        })
      }

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })

    // Netegem i importem converses
    await new Promise<void>((resolve, reject) => {
      const transaction = chatDB.transaction(["conversations"], "readwrite")
      const store = transaction.objectStore("conversations")

      const clearRequest = store.clear()
      clearRequest.onsuccess = () => {
        data.conversations.forEach((conversation: any) => {
          store.add(conversation)
        })
      }

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })

    // Netegem i importem missatges
    await new Promise<void>((resolve, reject) => {
      const transaction = chatDB.transaction(["messages"], "readwrite")
      const store = transaction.objectStore("messages")

      const clearRequest = store.clear()
      clearRequest.onsuccess = () => {
        data.messages.forEach((message: any) => {
          store.add(message)
        })
      }

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })

    // Tanquem les bases de dades
    usersDB.close()
    chatDB.close()

    return true
  } catch (error) {
    console.error("Error en importar dades:", error)
    throw error
  }
}
