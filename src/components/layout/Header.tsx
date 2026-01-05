"use client";

import Link from "next/link";
import { CircleUser, Menu, Package2, Home, DollarSign, Users, Settings, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { signOut, useSession } from "next-auth/react";
import { useSidebarStore } from "@/stores/useSidebarStore";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { type ComponentType } from "react";

// Static General Links
const generalLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/billing", label: "Facturación", icon: DollarSign },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/settings", label: "Configuración", icon: Settings },
];

// Map for dynamic module icons
const iconMap: { [key: string]: ComponentType<{ className: string }> } = {
  '/client-portal': LayoutGrid,
};

export function Header() {
  const { toggleSidebar } = useSidebarStore();
  const pathname = usePathname();
  const { data: session } = useSession(); // Get session data

  // Dynamically generate moduleLinks from the session
  const moduleLinks = session?.user?.modules?.map(module => ({
    href: module.path || `/`,
    label: module.name.replace(/\s*\(.*?\)\s*/g, ''), // Strip content in parentheses
    icon: iconMap[module.path] || Package2,
  })) || [];

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
      {/* --- Mobile Sidebar --- */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col bg-background">
          <nav className="grid gap-2 text-lg font-medium">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold mb-4"
            >
              <Package2 className="h-6 w-6" />
              <span>MassivaMovil ERP</span>
            </Link>
            
            {/* General Links */}
            {generalLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className={cn("flex items-center gap-4 rounded-xl px-3 py-2 transition-all", pathname === href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            ))}

            {/* Separator */}
            {moduleLinks.length > 0 && <div className="my-2 h-px bg-gray-200" />}

            {/* Dynamic Module Links */}
            {moduleLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className={cn("flex items-center gap-4 rounded-xl px-3 py-2 transition-all", pathname === href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {/* --- Desktop Sidebar Toggle --- */}
      <Button
        variant="outline"
        size="icon"
        className="shrink-0 hidden md:flex"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle sidebar</span>
      </Button>

      {/* --- Header Content (Right Side) --- */}
      <div className="w-full flex-1" /> {/* This is a spacer */}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="rounded-full">
            <CircleUser className="h-5 w-5" />
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {session?.user?.email && (
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{session.user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
            </DropdownMenuLabel>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem>My Account</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuItem>Support</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()}>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}