"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  email: z.string().email({ message: "El email no es válido." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  remember: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      redirect: false,
      email: data.email,
      password: data.password,
    });

    if (result?.error) {
      setError("Credenciales inválidas. Por favor, inténtalo de nuevo.");
      setIsLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Accede a tu cuenta
        </h2>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="text-red-500 text-sm text-center bg-red-100 dark:bg-red-900/20 p-2 rounded-md">{error}</div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Login</Label>
          <Input
            id="email"
            type="email"
            placeholder="email@example.com"
            autoComplete="email"
            {...form.register("email")}
            disabled={isLoading}
            className="h-10"
          />
          {form.formState.errors.email && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            {...form.register("password")}
            disabled={isLoading}
            className="h-10"
          />
          {form.formState.errors.password && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
                 <Checkbox id="remember" {...form.register("remember")} disabled={isLoading} />
                <Label htmlFor="remember" className="text-sm font-medium leading-none">
                    Recuérdame
                </Label>
            </div>
            <Link href="/auth/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                ¿Olvidaste tu contraseña?
            </Link>
        </div>

        <div>
          <Button type="submit" className="w-full h-10 text-base bg-cyan-600 hover:bg-cyan-700" disabled={isLoading}>
            {isLoading ? "Iniciando Sesión..." : "Iniciar Sesión"}
          </Button>
        </div>
      </form>
    </div>
  );
}