"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createUser, type User } from "@/lib/auth"
import { ArrowLeft, Loader2 } from "lucide-react"

interface RegisterFormProps {
  onRegisterSuccess: (user: User) => void
  onCancel: () => void
}

export default function RegisterForm({ onRegisterSuccess, onCancel }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    department: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Limpiamos el error cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, role: value }))
    if (errors.role) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.role
        return newErrors
      })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es obligatorio"
    }

    if (!formData.role) {
      newErrors.role = "El rol es obligatorio"
    }

    if (!formData.password) {
      newErrors.password = "La contraseña es obligatoria"
    } else if (formData.password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres"
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Creamos el avatar con las iniciales del nombre
      const nameParts = formData.name.split(" ")
      const avatar = nameParts.length > 1 ? `${nameParts[0][0]}${nameParts[1][0]}` : formData.name.substring(0, 2)

      const newUser: User = {
        id: `user_${Date.now()}`,
        name: formData.name,
        role: formData.role,
        department: formData.department || undefined,
        avatar: avatar.toUpperCase(),
        password: formData.password,
      }

      const createdUser = await createUser(newUser)
      if (createdUser) {
        onRegisterSuccess(createdUser)
      } else {
        setErrors({ general: "No se ha podido crear el usuario. Por favor, inténtalo de nuevo." })
      }
    } catch (error) {
      console.error("Error creating user:", error)
      setErrors({ general: "Ha habido un error al crear el usuario. Por favor, inténtalo de nuevo." })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Registro de usuario</CardTitle>
        <CardDescription className="text-center">Crea una nueva cuenta para acceder al chatbot</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo</Label>
            <Input
              id="name"
              name="name"
              placeholder="Introduce tu nombre completo"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Select value={formData.role} onValueChange={handleRoleChange}>
              <SelectTrigger id="role" className={errors.role ? "border-red-500 focus-visible:ring-red-500" : ""}>
                <SelectValue placeholder="Selecciona tu rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Médico/a">Médico/a</SelectItem>
                <SelectItem value="Enfermero/a">Enfermero/a</SelectItem>
                <SelectItem value="Administrativo/a">Administrativo/a</SelectItem>
                <SelectItem value="Técnico/a">Técnico/a</SelectItem>
                <SelectItem value="Otro/a">Otro/a</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && <p className="text-sm text-red-500">{errors.role}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Departamento (opcional)</Label>
            <Input
              id="department"
              name="department"
              placeholder="Introduce tu departamento"
              value={formData.department}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Introduce tu contraseña"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirma la contraseña</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Confirma tu contraseña"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
          </div>

          {errors.general && (
            <div className="bg-red-50 p-3 rounded-md border border-red-200">
              <p className="text-sm text-red-500">{errors.general}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando usuario...
              </>
            ) : (
              "Crear usuario"
            )}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al inicio de sesión
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
