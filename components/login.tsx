"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar } from "@/components/ui/avatar"
import { getUsers, setCurrentUser, verifyCredentials, type User } from "@/lib/auth"
import { initUserDatabase } from "@/lib/init-data"
import { UserPlus, LogIn, Loader2, Info } from "lucide-react"
import RegisterForm from "./register-form"

interface LoginProps {
  onLogin: (user: User) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const loadUsers = async () => {
      try {
        // Primero inicializamos la base de datos
        await initUserDatabase()

        // Después obtenemos los usuarios
        const userList = await getUsers()
        setUsers(userList)
      } catch (error) {
        console.error("Error loading users:", error)
        setError("No se han podido cargar los usuarios. Por favor, recarga la página.")
      } finally {
        setIsLoading(false)
      }
    }

    loadUsers()
  }, [])

  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
    setPassword("")
    setLoginError(null)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (loginError) {
      setLoginError(null)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedUser || !password) {
      return
    }

    setIsSubmitting(true)

    try {
      const user = await verifyCredentials(selectedUser.id, password)
      if (user) {
        setCurrentUser(user)
        onLogin(user)
      } else {
        setLoginError("Contraseña incorrecta. Por favor, inténtalo de nuevo.")
      }
    } catch (error) {
      console.error("Error verifying credentials:", error)
      setLoginError("Ha habido un error al verificar las credenciales. Por favor, inténtalo de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegisterSuccess = async (user: User) => {
    setShowRegisterForm(false)
    // Actualizamos la lista de usuarios
    const userList = await getUsers()
    setUsers(userList)
    // Seleccionamos el usuario nuevo
    setSelectedUser(user)
  }

  // Si se está mostrando el formulario de registro
  if (showRegisterForm) {
    return <RegisterForm onRegisterSuccess={handleRegisterSuccess} onCancel={() => setShowRegisterForm(false)} />
  }

  // Si se ha seleccionado un usuario, mostramos el formulario de contraseña
  if (selectedUser) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Iniciar sesión</CardTitle>
          <CardDescription className="text-center">Introduce tu contraseña para continuar</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-4 border rounded-md bg-gray-50">
              <Avatar className="h-12 w-12">
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-lg">
                  {selectedUser.avatar || selectedUser.name.substring(0, 2)}
                </div>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium text-lg">{selectedUser.name}</span>
                <span className="text-sm text-muted-foreground">
                  {selectedUser.role} {selectedUser.department ? `- ${selectedUser.department}` : ""}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Introduce tu contraseña"
                value={password}
                onChange={handlePasswordChange}
                className={loginError ? "border-red-500" : ""}
              />
              {loginError && (
                <div className="text-sm text-red-500 bg-red-50 p-2 rounded-md border border-red-200">{loginError}</div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button type="submit" className="w-full" disabled={!password || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Iniciar sesión
                </>
              )}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => setSelectedUser(null)}>
              Volver a la selección de usuario
            </Button>
          </CardFooter>
        </form>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-red-600">Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => window.location.reload()} className="w-full">
            Volver a intentar
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Iniciar sesión</CardTitle>
        <CardDescription className="text-center">
          Selecciona tu usuario para acceder al chatbot del Hospital Sant Joan de Déu
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {users.map((user) => (
                <Button
                  key={user.id}
                  variant="outline"
                  className="w-full justify-start p-4 h-auto hover:bg-gray-50 hover:border-primary/50 transition-colors"
                  onClick={() => handleUserSelect(user)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
                        {user.avatar || user.name.substring(0, 2)}
                      </div>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {user.role} {user.department ? `- ${user.department}` : ""}
                      </span>
                    </div>
                  </div>
                </Button>
              ))}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">o</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full bg-accent/5 hover:bg-accent/10 border-accent/20 hover:border-accent/30 text-gray-800"
              onClick={() => setShowRegisterForm(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Crear un nuevo usuario
            </Button>

            <div className="bg-blue-50 p-3 rounded-md border border-blue-100 text-sm text-blue-700 flex items-start gap-2 mt-4">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Almacenamiento de datos</p>
                <p>Tus datos se guardan localmente en tu navegador y se mantendrán incluso después de cerrarlo.</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
