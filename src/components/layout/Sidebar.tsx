"use client";

import { useSession, signOut } from "next-auth/react";
import { Home, DollarSign, Users, Settings, LogOut, Package2, ShoppingCart, type LucideIcon } from "lucide-react";
import Link from 'next/link';
import { useSidebarStore } from "@/stores/useSidebarStore";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { type ComponentType, useState, useEffect } from "react";

interface ModuleLink {
    name: string;
    path: string;
    icon?: string; // Icon name as a string from the database
}

// Map string names to actual icon components
const iconMap: { [key: string]: LucideIcon } = {
  Home: Home,
  ShoppingCart: ShoppingCart,
  DollarSign: DollarSign,
  Users: Users,
  Settings: Settings,
};

const DefaultIcon = Package2; // Generic fallback icon

// These links are always present and are not controlled by the database
const staticNavLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
];

const staticNavLinksEnds = [
  { href: "/settings", label: "Configuración", icon: Settings },
];

export function Sidebar() {
  const { isCollapsed, setCollapsed } = useSidebarStore();
  const pathname = usePathname();
  const { status } = useSession();
  
  const [dynamicLinks, setDynamicLinks] = useState<ModuleLink[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);

  // Close sidebar on pathname change
  useEffect(() => {
    setCollapsed(true);
  }, [pathname, setCollapsed]);

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
          
          const staticModuleNames = staticNavLinks.map(l => l.label);
          const filteredModules = modules.filter(m => !staticModuleNames.includes(m.name));

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
      {/* Overlay */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={() => setCollapsed(true)}
        />
      )}
      <div
        className={cn(
          "fixed top-0 left-0 h-screen w-64 border-r bg-background text-foreground transition-transform duration-300 ease-in-out z-50",
          isCollapsed ? "-translate-x-full" : "translate-x-0"
        )}
      >
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex-1 overflow-auto py-2">
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
                      className={cn("flex items-center gap-3 rounded-lg px-3 py-2 transition-all", pathname === href ? "text-white bg-cyan-500" : "text-black hover:text-white hover:bg-cyan-500")}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="truncate">{label}</span>
                    </Link>
                  ))}

                  {dynamicLinks.length > 0 && <div className="my-2 h-px bg-gray-200 dark:bg-gray-500" />}

                  {dynamicLinks.map((link) => {
                    const Icon = link.icon && iconMap[link.icon] ? iconMap[link.icon] : DefaultIcon;
                    return (
                      <Link
                        key={link.name}
                        href={link.path}
                        className={cn("flex items-center gap-3 rounded-lg px-3 py-2 transition-all", pathname === link.path ? "text-white bg-cyan-500" : "text-black hover:text-white hover:bg-cyan-500")}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="truncate">{link.name}</span>
                      </Link>
                    );
                  })}

                  {dynamicLinks.length > 0 && <div className="my-2 h-px bg-gray-200 dark:bg-gray-500" />}

                  {staticNavLinksEnds.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={label}
                      href={href}
                      className={cn("flex items-center gap-3 rounded-lg px-3 py-2 transition-all", pathname === href ? "text-white bg-cyan-500" : "text-black hover:text-white hover:bg-cyan-500")}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="truncate">{label}</span>
                    </Link>
                  ))}
                </>
              )}
            </nav>
          </div>
          <div className="mt-auto p-4 border-t">
            <Button variant="ghost" className="w-full justify-start" onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span className="truncate">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}