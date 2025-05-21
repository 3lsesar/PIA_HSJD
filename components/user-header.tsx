"use client"

import { type User, logout } from "@/lib/auth"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

interface UserHeaderProps {
  user: User
  onLogout: () => void
}

export default function UserHeader({ user, onLogout }: UserHeaderProps) {
  const handleLogout = () => {
    logout()
    onLogout()
  }

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-white rounded-lg shadow-sm mb-4 border">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border-2 border-primary/20">
          <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
            {user.avatar || user.name.substring(0, 2)}
          </div>
        </Avatar>
        <div>
          <div className="font-medium text-gray-800">{user.name}</div>
          <div className="text-xs text-gray-500">
            {user.role} {user.department ? `- ${user.department}` : ""}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="text-gray-600 hover:text-red-600 hover:bg-red-50"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Cerrar sesión
      </Button>
    </div>
  )
}
