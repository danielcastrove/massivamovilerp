// massivamovilerp/src/app/auth/login/page.tsx
"use client";

import LoginForm from "@/components/auth/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex flex-col justify-center w-full max-w-md mx-auto p-4 sm:p-8">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md flex flex-col flex-grow">
        <div className="text-center">
          <img src="/massivamovil.png" alt="MassivaMovil Logo" className="mx-auto h-12 w-auto mb-2" />
        </div>
        <div className="mt-4">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}