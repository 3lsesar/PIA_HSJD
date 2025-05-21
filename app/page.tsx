"use client"

import { useState, useEffect } from "react"
import ChatInterface from "@/components/chat-interface"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import HistoryView from "@/components/history-view"
import Login from "@/components/login"
import UserHeader from "@/components/user-header"
import HospitalLogo from "@/components/hospital-logo"
import FixITLogo from "@/components/fixit-logo"
import BackgroundDecoration from "@/components/background-decoration"
import { getCurrentUser, type User } from "@/lib/auth"

export default function Home() {
  const [isClient, setIsClient] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  useEffect(() => {
    setIsClient(true)
    // Comprobamos si hay un usuario en localStorage
    const user = getCurrentUser()
    if (user) {
      setCurrentUser(user)
    }
  }, [])

  const handleLogin = (user: User) => {
    setCurrentUser(user)
  }

  const handleLogout = () => {
    setCurrentUser(null)
  }

  // Mostramos un estado de carga hasta que estamos seguros de que estamos en el cliente
  if (!isClient) {
    return (
      <main className="flex min-h-screen flex-col p-4 md:p-8">
        <div className="flex justify-center mb-8">
          <div className="animate-pulse bg-gray-200 h-16 w-40 rounded"></div>
        </div>
        <div className="flex-1 container max-w-5xl mx-auto flex items-center justify-center">
          <div className="animate-pulse bg-gray-200 h-64 w-full max-w-md rounded"></div>
        </div>
      </main>
    )
  }

  // Si no hay usuario, mostramos la pantalla de login
  if (!currentUser) {
    return (
      <main className="flex min-h-screen flex-col p-4 md:p-8 bg-gray-50">
        <BackgroundDecoration />
        <header className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <HospitalLogo />
          </div>
          <div className="flex justify-center mb-4">
            <FixITLogo width={120} height={120} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">FixIT</h1>
          <p className="text-gray-600">Asistente técnico para los trabajadores del Hospital Sant Joan de Déu</p>
        </header>

        <div className="flex-1 container max-w-5xl mx-auto flex items-center justify-center">
          <Login onLogin={handleLogin} />
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8 bg-gray-50">
      <BackgroundDecoration />
      <header className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <HospitalLogo />
        </div>
        <div className="flex justify-center mb-4">
          <FixITLogo width={100} height={100} />
        </div>
        <h1 className="text-3xl font-bold text-gray-800">FixIT</h1>
        <p className="text-gray-600">Asistente técnico para los trabajadores del Hospital Sant Joan de Déu</p>
      </header>

      <div className="flex-1 container max-w-5xl mx-auto">
        <UserHeader user={currentUser} onLogout={handleLogout} />

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
              <TabsTrigger value="chat" className="py-3">
                Chat
              </TabsTrigger>
              <TabsTrigger value="history" className="py-3">
                Historial
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="p-0">
              <div className="h-[70vh]">
                <ChatInterface user={currentUser} />
              </div>
            </TabsContent>

            <TabsContent value="history" className="p-0">
              <div className="h-[70vh]">
                <HistoryView user={currentUser} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  )
}
