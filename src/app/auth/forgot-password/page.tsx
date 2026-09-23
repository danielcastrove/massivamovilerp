"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/forgot-password";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "all",
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.message || "Error al procesar la solicitud.");
        return;
      }

      setSent(true);
    } catch {
      setError("Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col justify-center w-full max-w-md mx-auto p-4 sm:p-8">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md flex flex-col flex-grow">
          <div className="text-center">
            <img src="/massivamovil.png" alt="MassivaMovil Logo" className="mx-auto h-12 w-auto mb-2" />
          </div>
          <div className="mt-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Correo enviado
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Si la cuenta{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {form.getValues("email")}
              </span>{" "}
              existe, recibirás un correo con una contraseña temporal válida por 1 hora.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Revisa tu bandeja de entrada y tu carpeta de spam.
            </p>
            <Link href="/auth/login">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al inicio de sesión
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center w-full max-w-md mx-auto p-4 sm:p-8">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md flex flex-col flex-grow">
        <div className="text-center">
          <img src="/massivamovil.png" alt="MassivaMovil Logo" className="mx-auto h-12 w-auto mb-2" />
        </div>
        <div className="mt-4 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Recuperar contraseña
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Ingresa tu correo electrónico y te enviaremos una contraseña temporal válida por 1 hora.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="text-red-500 text-sm text-center bg-red-100 dark:bg-red-900/20 p-2 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  autoComplete="email"
                  {...form.register("email")}
                  disabled={loading}
                  className="h-10 pl-10"
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 text-base bg-cyan-600 hover:bg-cyan-700"
              disabled={loading || !form.formState.isValid}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar contraseña temporal"
              )}
            </Button>
          </form>

          <div className="text-center">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              <ArrowLeft className="inline mr-1 h-3 w-3" />
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
