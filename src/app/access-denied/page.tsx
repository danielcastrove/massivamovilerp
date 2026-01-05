"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function AccessDeniedPage() {
  const [countdown, setCountdown] = useState(30);
  const router = useRouter();

  useEffect(() => {
    // Si el contador llega a 0, no hacer nada más en el intervalo
    if (countdown === 0) {
      router.push("/dashboard");
      return;
    }

    // Configurar el intervalo para que se ejecute cada segundo
    const intervalId = setInterval(() => {
      setCountdown((currentCountdown) => currentCountdown - 1);
    }, 1000);

    // Limpiar el intervalo cuando el componente se desmonte o el contador cambie
    return () => clearInterval(intervalId);
  }, [countdown, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 text-center">
      <div className="max-w-md w-full space-y-8 p-10 bg-white shadow-lg rounded-xl">
        <div>
          <h1 className="text-4xl font-bold text-red-600 mb-4">Acceso Denegado</h1>
          <p className="text-lg text-gray-700 mb-6">
            No tienes los permisos necesarios para acceder a esta página.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Serás redirigido al dashboard en {countdown} segundos...
          </p>
        </div>
        <Link href="/dashboard" passHref>
          <Button>Ir al Dashboard Ahora</Button>
        </Link>
      </div>
    </div>
  );
}