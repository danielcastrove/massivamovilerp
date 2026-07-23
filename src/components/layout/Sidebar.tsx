"use client";

import { useSession, signOut } from "next-auth/react";
import { Home, DollarSign, Users, Settings, LogOut, Package2, ShoppingCart, ShieldCheck, LayoutGrid, Receipt, UserPlus, Coins, type LucideIcon } from "lucide-react";
import Link from 'next/link';
import { useSidebarStore } from "@/stores/useSidebarStore";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useState, useEffect } from "react";

interface ModuleLink {
    name: string;
    path: string;
    icon?: string;
}

// Map string names to actual icon components
const iconMap: { [key: string]: LucideIcon } = {
  Home: Home,
  ShoppingCart: ShoppingCart,
  DollarSign: DollarSign,
  Users: Users,
  Settings: Settings,
  Package2: Package2,
  ShieldCheck: ShieldCheck,
  LayoutGrid: LayoutGrid,
  Receipt: Receipt,
  UserPlus: UserPlus,
  Coins: Coins
};

const DefaultIcon = Package2;

// Custom order priority
const ORDER_PRIORITY = [
  "Dashboard",
  "Leads",
  "Clientes",
  "Facturación",
  "Productos",
  "Cobranza",
  "Portal Cliente",
  "Seguridad y Roles",
  "Configuración"
];

// These links are always present and are not controlled by the database
const staticNavLinks: { href: string; label: string; icon: LucideIcon }[] = [];

const staticNavLinksEnds = [
  { href: "/settings", label: "Configuración", icon: Settings },
];

export function Sidebar() {
  const { isCollapsed, setCollapsed } = useSidebarStore();
  const pathname = usePathname();
  const { status } = useSession();

  const [dynamicLinks, setDynamicLinks] = useState<ModuleLink[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);

  // Close sidebar on pathname change only on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setCollapsed]);

  useEffect(() => {
    async function fetchAllowedModules() {
      if (status === "authenticated") {
        setLoadingModules(true);
        try {
          const response = await fetch('/api/navigation/modules');
          if (!response.ok) {
            throw new Error(`Failed to fetch navigation modules: ${response.statusText}`);
          }
          const modules: ModuleLink[] = await response.json();

          // Clean names (remove content in parentheses) and filter static paths
          const cleanedModules = modules.map(m => ({
            ...m,
            name: m.name.replace(/\s*\(.*?\)\s*/g, '').trim()
          }));

          const staticModulePaths = [...staticNavLinks, ...staticNavLinksEnds].map(l => l.href);
          const filteredModules = cleanedModules.filter(m => !staticModulePaths.includes(m.path));

          // Sort based on ORDER_PRIORITY
          filteredModules.sort((a, b) => {
            const indexA = ORDER_PRIORITY.indexOf(a.name);
            const indexB = ORDER_PRIORITY.indexOf(b.name);

            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.name.localeCompare(b.name);
          });

          setDynamicLinks(filteredModules);

        } catch (error) {
          console.error("Failed to fetch modules:", error);
          setDynamicLinks([]);
        } finally {
          setLoadingModules(false);
        }
      } else if (status === "unauthenticated") {
        setLoadingModules(false);
        setDynamicLinks([]);
      }
    }

    fetchAllowedModules();
  }, [status]);

  const isLoading = status === 'loading' || loadingModules;

  return (
    <>
      {/* Overlay - Desktop and Mobile when expanded */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setCollapsed(true)}
        />
      )}
      <div
        className={cn(
          "fixed top-0 left-0 h-screen border-r bg-background text-foreground transition-all duration-300 ease-in-out z-50",
          isCollapsed ? "w-16 translate-x-0" : "w-64 translate-x-0 shadow-2xl",
          isCollapsed ? "max-md:-translate-x-full" : "max-md:translate-x-0"
        )}
      >
        <div className="flex h-full max-h-screen flex-col gap-2">
          {/* Logo Section */}
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px]">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <Package2 className="h-6 w-6 text-cyan-600 shrink-0" />
              {!isCollapsed && <span className="truncate">MassivaMovil ERP</span>}
            </Link>
          </div>

          <div className="flex-1 overflow-x-hidden overflow-auto py-2">
            <nav className="grid items-start px-2 text-sm font-medium">
              {isLoading ? (
                <div className="flex justify-center items-center p-4">
                  <Spinner />
                </div>
              ) : (
                <>
                  {staticNavLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={label}
                      href={href}
                      title={isCollapsed ? label : ""}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all my-0.5",
                        pathname === href 
                          ? "text-white bg-cyan-600 shadow-sm" 
                          : "text-slate-600 hover:text-cyan-600 hover:bg-cyan-50"
                      )}
                    >
                      <Icon className={cn("h-5 w-5 shrink-0", pathname === href ? "text-white" : "text-slate-500")} />
                      {!isCollapsed && <span className="truncate">{label}</span>}
                    </Link>
                  ))}

                  {dynamicLinks.length > 0 && <div className="my-2 h-px bg-slate-100 mx-2" />}

                  {dynamicLinks.map((link) => {
                    const Icon = link.icon && iconMap[link.icon] ? iconMap[link.icon] : DefaultIcon;
                    const isActive = pathname === link.path;
                    return (
                      <Link
                        key={link.name}
                        href={link.path}
                        title={isCollapsed ? link.name : ""}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 transition-all my-0.5",
                          isActive 
                            ? "text-white bg-cyan-600 shadow-sm" 
                            : "text-slate-600 hover:text-cyan-600 hover:bg-cyan-50"
                        )}
                      >
                        <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-slate-500")} />
                        {!isCollapsed && <span className="truncate">{link.name}</span>}
                      </Link>
                    );
                  })}

                  {(dynamicLinks.length > 0 || staticNavLinksEnds.length > 0) && <div className="my-2 h-px bg-slate-100 mx-2" />}

                  {staticNavLinksEnds.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={label}
                      href={href}
                      title={isCollapsed ? label : ""}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all my-0.5",
                        pathname === href 
                          ? "text-white bg-cyan-600 shadow-sm" 
                          : "text-slate-600 hover:text-cyan-600 hover:bg-cyan-50"
                      )}
                    >
                      <Icon className={cn("h-5 w-5 shrink-0", pathname === href ? "text-white" : "text-slate-500")} />
                      {!isCollapsed && <span className="truncate">{label}</span>}
                    </Link>
                  ))}
                </>
              )}
            </nav>
          </div>
          <div className="mt-auto p-2 border-t">
            <Button 
              variant="ghost" 
              className={cn(
                "w-full transition-all text-slate-600 hover:text-red-600 hover:bg-red-50",
                isCollapsed ? "justify-center px-0" : "justify-start px-3"
              )} 
              onClick={() => signOut()}
              title={isCollapsed ? "Cerrar Sesión" : ""}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span className="ml-3 truncate font-medium">Cerrar Sesión</span>}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}