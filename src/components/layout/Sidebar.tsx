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
  { href: "/settings", label: "Configuración", icon: Settings },
];

export function Sidebar() {
  const { isCollapsed } = useSidebarStore();
  const pathname = usePathname();
  const { status } = useSession();
  
  const [dynamicLinks, setDynamicLinks] = useState<ModuleLink[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);

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
          
          // Filter out the modules that are already in the static list
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
    <div className={cn("sticky top-0 h-screen hidden md:block border-r bg-background text-foreground transition-all duration-300")}>
      <div className={cn("flex h-full max-h-screen flex-col gap-2", isCollapsed && "overflow-hidden")}>

        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-2 text-sm font-medium">
            {isLoading ? (
              <div className="flex justify-center items-center p-4">
                <Spinner />
              </div>
            ) : (
              <>
                {/* Render static links */}
                {staticNavLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={label}
                    href={href}
                    className={cn("flex items-center gap-3 rounded-lg px-3 py-2 transition-all", pathname === href ? "text-white bg-cyan-500" : "text-black hover:text-white hover:bg-cyan-500")}
                  >
                    <Icon className="h-4 w-4 text-cyan-500" />
                    <span className={cn("truncate", { "hidden": isCollapsed })}>{label}</span>
                  </Link>
                ))}

                {/* Separator if there are dynamic links */}
                {dynamicLinks.length > 0 && <div className="my-2 h-px bg-gray-200 dark:bg-gray-500" />}

                {/* Render dynamic links from the API */}
                {dynamicLinks.map((link) => {
                  const Icon = link.icon && iconMap[link.icon] ? iconMap[link.icon] : DefaultIcon;
                  return (
                    <Link
                      key={link.name}
                      href={link.path}
                      className={cn("flex items-center gap-3 rounded-lg px-3 py-2 transition-all", pathname === link.path ? "text-white bg-cyan-500" : "text-black hover:text-white hover:bg-cyan-500")}
                    >
                      <Icon className="h-4 w-4 text-cyan-500" />
                      <span className={cn("truncate", { "hidden": isCollapsed })}>{link.name}</span>
                    </Link>
                  );
                })}
              </>
            )}
          </nav>
        </div>
        <div className="mt-auto p-4 border-t">
          <Button variant="ghost" className="w-full justify-start" onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            <span className={cn("truncate", { "hidden": isCollapsed })}>Logout</span>
          </Button>
        </div>
      </div>
    </div>
  );
}