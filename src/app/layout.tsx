"use client";
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { SessionProvider, useSession } from "next-auth/react";
import { useSidebarStore } from "@/stores/useSidebarStore";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import { Spinner } from '@/components/ui/spinner';

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <AppContent>{children}</AppContent>
        </SessionProvider>
      </body>
    </html>
  );
}

const authRoutes = ["/auth/login", "/auth/register", "/auth/forgot-password"];

function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = authRoutes.includes(pathname);
  const { isCollapsed } = useSidebarStore();
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const isAuthLoading = status === 'loading';
  const router = useRouter();

  useEffect(() => {
    // Set the browser tab title
    document.title = "MassivaMovil ERP";
  }, []);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated && !isAuthRoute) {
      router.push('/auth/login');
    }
  }, [isAuthLoading, isAuthenticated, isAuthRoute, router]);

  // --- RENDER LOGIC ---

  // 1. If the initial auth check is happening, show a global spinner.
  if (isAuthLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  // 2. If it's an auth route, show the centered content (login form).
  if (isAuthRoute) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-background">
        {children}
      </main>
    );
  }

  // 3. If authenticated and on a protected route, show the full dashboard layout.
  if (isAuthenticated) {
    return (
      <div className={cn(
        "grid min-h-screen w-full",
        isCollapsed ? "md:grid-cols-[0px_1fr]" : "md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]"
      )}>
        <Sidebar />
        <div className="flex flex-col">
          <Header />
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // 4. If not authenticated on a protected route, the redirect is happening. Render null.
  return null;
}