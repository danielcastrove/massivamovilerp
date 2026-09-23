"use client";

import { useState } from "react";
import { UserRole } from "@prisma/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, UserCircle, Lock, Eye, EyeOff } from "lucide-react";
import {
  updateProfileSchema,
  changePasswordSchema,
  type UpdateProfileInput,
  type ChangePasswordInput,
} from "@/lib/validations/profile";

export interface SettingsPageUser {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  telefono_celular: string | null;
  cargo: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  roles: { id: string; name: string } | null;
  Customer: { id: string; name: string; doc_number: string } | null;
}

export interface SettingsPageData {
  user: SettingsPageUser;
}

const roleLabel: Record<string, string> = {
  MASSIVA_ADMIN: "Administrador",
  MASSIVA_EXTRA: "Extra",
  CLIENTE: "Cliente",
};

interface SettingsPageClientProps {
  initialData: SettingsPageData;
}

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Débil", color: "bg-red-500" };
  if (score <= 2) return { score, label: "Regular", color: "bg-orange-500" };
  if (score <= 3) return { score, label: "Buena", color: "bg-yellow-500" };
  if (score <= 4) return { score, label: "Fuerte", color: "bg-lime-500" };
  return { score, label: "Muy fuerte", color: "bg-emerald-500" };
}

export default function SettingsPageClient({ initialData }: SettingsPageClientProps) {
  const [user, setUser] = useState(initialData.user);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const profileForm = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      nombre: user.nombre ?? "",
      apellido: user.apellido ?? "",
      telefono_celular: user.telefono_celular ?? "",
      cargo: user.cargo ?? "",
    },
    mode: "all",
  });

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "all",
  });

  const watchNewPassword = passwordForm.watch("newPassword");

  async function onProfileSubmit(values: UpdateProfileInput) {
    setProfileLoading(true);
    setProfileSuccess(false);
    setProfileError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setProfileError(j.message || j.errors?.nombre?.[0] || "Error al guardar los cambios.");
        return;
      }

      const j = await res.json();
      setUser((prev) => ({ ...prev, ...j.user }));
      setProfileSuccess(true);
    } catch (e) {
      console.error(e);
      setProfileError("Error inesperado.");
    } finally {
      setProfileLoading(false);
    }
  }

  async function onPasswordSubmit(values: ChangePasswordInput) {
    setPasswordLoading(true);
    setPasswordSuccess(false);
    setPasswordError(null);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setPasswordError(j.message || j.errors?.currentPassword?.[0] || "Error al cambiar la contraseña.");
        return;
      }

      setPasswordSuccess(true);
      passwordForm.reset();
    } catch (e) {
      console.error(e);
      setPasswordError("Error inesperado.");
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Datos Personales */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <UserCircle className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-tight">
                Datos Personales
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Información básica de tu cuenta
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase text-slate-400">Correo:</span>
              <span className="text-xs font-mono text-slate-600">{user.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase text-slate-400">Rol:</span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                user.role === UserRole.MASSIVA_ADMIN
                  ? "bg-violet-100 text-violet-700"
                  : user.role === UserRole.CLIENTE
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-cyan-100 text-cyan-700"
              }`}>
                {roleLabel[user.role]}
              </span>
            </div>
            {user.roles && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-slate-400">Rol DB:</span>
                <span className="text-xs text-slate-500">{user.roles.name}</span>
              </div>
            )}
          </div>

          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} noValidate className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre *</FormLabel>
                      <FormControl>
                        <Input placeholder="Tu nombre" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="apellido"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido</FormLabel>
                      <FormControl>
                        <Input placeholder="Tu apellido" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="telefono_celular"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="0412-0000000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="cargo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo</FormLabel>
                      <FormControl>
                        <Input placeholder="Tu cargo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {profileError && <p className="text-sm text-red-600 font-medium">{profileError}</p>}
              {profileSuccess && <p className="text-sm text-emerald-600 font-medium">Datos actualizados correctamente.</p>}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={profileLoading || !profileForm.formState.isDirty}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  {profileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Cambiar Contraseña */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Lock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-tight">
                Cambiar Contraseña
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Actualiza tu contraseña de acceso
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} noValidate className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña actual *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showCurrent ? "text" : "password"} placeholder="••••••" {...field} className="pr-10" />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowCurrent((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva contraseña *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showNew ? "text" : "password"} placeholder="••••••" {...field} className="pr-10" />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowNew((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    {watchNewPassword.length > 0 && (
                      <div className="space-y-1 mt-1">
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }).map((_, i) => {
                            const str = passwordStrength(watchNewPassword);
                            return (
                              <div
                                key={i}
                                className={`h-1.5 flex-1 rounded-full transition-colors ${
                                  i < str.score ? str.color : "bg-slate-200"
                                }`}
                              />
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Fortaleza: {passwordStrength(watchNewPassword).label}
                        </p>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar contraseña *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showConfirm ? "text" : "password"} placeholder="••••••" {...field} className="pr-10" />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowConfirm((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {passwordError && <p className="text-sm text-red-600 font-medium">{passwordError}</p>}
              {passwordSuccess && <p className="text-sm text-emerald-600 font-medium">Contraseña actualizada correctamente. Se envió un correo de confirmación.</p>}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={passwordLoading || !passwordForm.formState.isValid}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Lock className="mr-2 h-4 w-4" />
                  Cambiar Contraseña
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
