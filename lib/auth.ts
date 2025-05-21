// Tipos para el usuario
export type User = {
  id: string
  name: string
  role: string
  department?: string
  avatar?: string
  password?: string // Añadimos el campo de contraseña
}

// Función para abrir la base de datos de usuarios
function openUserDatabase(): Promise<IDBDatabase> {
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

    request.onsuccess = () => {
      resolve(request.result)
    }
  })
}

// Función para obtener todos los usuarios
export async function getUsers(): Promise<User[]> {
  try {
    const db = await openUserDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["users"], "readonly")
      const store = transaction.objectStore("users")
      const request = store.getAll()

      request.onsuccess = () => {
        // Devolvemos los usuarios sin las contraseñas por seguridad
        const users = request.result.map((user) => {
          const { password, ...userWithoutPassword } = user
          return userWithoutPassword
        })
        resolve(users)
      }

      request.onerror = () => {
        reject(request.error)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error("Error getting users:", error)
    return []
  }
}

// Función para obtener un usuario por su ID
export async function getUserById(id: string): Promise<User | null> {
  try {
    const db = await openUserDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["users"], "readonly")
      const store = transaction.objectStore("users")
      const request = store.get(id)

      request.onsuccess = () => {
        if (request.result) {
          // Devolvemos el usuario sin la contraseña por seguridad
          const { password, ...userWithoutPassword } = request.result
          resolve(userWithoutPassword)
        } else {
          resolve(null)
        }
      }

      request.onerror = () => {
        reject(request.error)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error("Error getting user:", error)
    return null
  }
}

// Función para verificar las credenciales de un usuario
export async function verifyCredentials(id: string, password: string): Promise<User | null> {
  try {
    const db = await openUserDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["users"], "readonly")
      const store = transaction.objectStore("users")
      const request = store.get(id)

      request.onsuccess = () => {
        const user = request.result
        if (user && user.password === password) {
          // Si las credenciales son correctas, devolvemos el usuario sin la contraseña
          const { password, ...userWithoutPassword } = user
          resolve(userWithoutPassword)
        } else {
          resolve(null)
        }
      }

      request.onerror = () => {
        reject(request.error)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error("Error verifying credentials:", error)
    return null
  }
}

// Función para crear un nuevo usuario
export async function createUser(user: User): Promise<User | null> {
  try {
    const db = await openUserDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["users"], "readwrite")
      const store = transaction.objectStore("users")

      // Generamos un ID único si no se proporciona uno
      if (!user.id) {
        user.id = `user_${Date.now()}`
      }

      const request = store.add(user)

      request.onsuccess = () => {
        // Devolvemos el usuario creado sin la contraseña
        const { password, ...userWithoutPassword } = user
        resolve(userWithoutPassword)
      }

      request.onerror = () => {
        reject(request.error)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error("Error creating user:", error)
    return null
  }
}

// Función para guardar el usuario actual en localStorage
export function setCurrentUser(user: User): void {
  localStorage.setItem("currentUser", JSON.stringify(user))
}

// Función para obtener el usuario actual de localStorage
export function getCurrentUser(): User | null {
  const userJson = localStorage.getItem("currentUser")
  if (!userJson) return null

  try {
    return JSON.parse(userJson)
  } catch (error) {
    console.error("Error parsing user from localStorage:", error)
    return null
  }
}

// Función para cerrar la sesión
export function logout(): void {
  localStorage.removeItem("currentUser")
}
