"use client";

import { useState, useMemo } from "react";
import { UserRole } from "@prisma/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Pencil, Trash2, UserPlus, MoreHorizontal, Loader2, ShieldCheck, UserRoundCog, Search, Download } from "lucide-react";
import { DataPagination } from "@/components/ui/data-pagination";
import * as XLSX from "xlsx";

export interface UsersPageUser {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  telefono_celular: string | null;
  cargo: string | null;
  role: UserRole;
  is_active: boolean;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
  created_at: string;
  roles_id: string | null;
  roles: { id: string; name: string } | null;
  Customer: { id: string; name: string; doc_number: string } | null;
}

export interface UsersPageData {
  users: UsersPageUser[];
  modulos: { id: string; name: string; path: string; icon: string | null }[];
  roles: { id: string; name: string }[];
  customers: { id: string; name: string; doc_number: string; user_id: string | null }[];
  userModuleMatrix: { role_id: string; module_id: string }[];
  currentUserRole: UserRole;
}

const userFormSchema = z.object({
  email: z.string().min(1, "El correo es requerido").email("Correo inválido"),
  nombre: z.string().min(1, "El nombre es requerido"),
  apellido: z.string(),
  telefono_celular: z.string(),
  cargo: z.string(),
  role: z.nativeEnum(UserRole, { message: "Selecciona un rol" }),
  is_active: z.boolean(),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]),
  modules: z.array(z.string()),
  customerId: z.string(),
  resetPassword: z
    .string()
    .refine((v) => v === "" || v.length >= 6, "La contraseña debe tener al menos 6 caracteres"),
  rol_name: z.string().optional().or(z.literal("")),
});

type UserFormValues = z.infer<typeof userFormSchema>;

const emptyFormValues: UserFormValues = {
  email: "",
  nombre: "",
  apellido: "",
  telefono_celular: "",
  cargo: "",
  role: UserRole.MASSIVA_EXTRA,
  is_active: true,
  status: "ACTIVE",
  modules: [],
  customerId: "",
  resetPassword: "",
  rol_name: "",
};

const roleLabel: Record<string, string> = {
  MASSIVA_ADMIN: "Administrador",
  MASSIVA_EXTRA: "Extra",
  CLIENTE: "Cliente",
};

const EXCLUDED_MODULE_NAMES = ["Portal de Cliente (Client View)", "Seguridad y Roles (RBAC)", "Configuración (Settings)"];
const ITEMS_PER_PAGE = 20;

function roleBadgeColor(role: UserRole): string {
  if (role === UserRole.MASSIVA_ADMIN) return "bg-violet-100 text-violet-700";
  if (role === UserRole.CLIENTE) return "bg-emerald-100 text-emerald-700";
  return "bg-cyan-100 text-cyan-700";
}

interface UsersPageClientProps {
  initialData: UsersPageData;
}

export default function UsersPageClient({ initialData }: UsersPageClientProps) {
  const [data, setData] = useState<UsersPageData>(initialData);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: emptyFormValues,
    mode: "all",
  });

  const watchRole = form.watch("role");
  const watchModules = form.watch("modules");

  const isAdmin = data.currentUserRole === UserRole.MASSIVA_ADMIN;

  function moduleIdsForUser(user: UsersPageUser): string[] {
    if (!user.roles_id) return [];
    return data.userModuleMatrix.filter((m) => m.role_id === user.roles_id).map((m) => m.module_id);
  }

  function openCreate() {
    setEditId(null);
    setError(null);
    form.reset({ ...emptyFormValues });
    setFormOpen(true);
  }

  function openEdit(user: UsersPageUser) {
    setEditId(user.id);
    setError(null);
    form.reset({
      email: user.email,
      nombre: user.nombre ?? "",
      apellido: user.apellido ?? "",
      telefono_celular: user.telefono_celular ?? "",
      cargo: user.cargo ?? "",
      role: user.role,
      is_active: user.is_active,
      status: user.status || "ACTIVE",
      modules: moduleIdsForUser(user),
      customerId: user.Customer?.id ?? "",
      resetPassword: "",
      rol_name: user.roles?.name ?? "",
    });
    setFormOpen(true);
  }

  function customerTaken(customerId: string, excludeUserId?: string): boolean {
    const cust = data.customers.find((c) => c.id === customerId);
    return !!cust?.user_id && cust.user_id !== excludeUserId;
  }

  async function onSubmit(values: UserFormValues) {
    setLoading(true);
    setError(null);
    try {
      const isCreate = !editId;

      if (values.role === UserRole.CLIENTE && values.customerId && customerTaken(values.customerId, isCreate ? undefined : editId ?? undefined)) {
        setError("El cliente seleccionado ya está vinculado a otro usuario.");
        setLoading(false);
        return;
      }

      if (!isAdmin && values.role === UserRole.MASSIVA_ADMIN) {
        setError("Solo un administrador puede crear o asignar el rol de administrador.");
        setLoading(false);
        return;
      }

      const payload = {
        email: values.email,
        nombre: values.nombre,
        apellido: values.apellido,
        telefono_celular: values.telefono_celular,
        cargo: values.cargo,
        role: values.role,
        is_active: values.status === "ACTIVE",
        status: values.status,
        modules: values.modules,
        customerId: values.role === UserRole.CLIENTE ? values.customerId || null : null,
        resetPassword: values.resetPassword || "",
        rol_name: values.role === UserRole.MASSIVA_EXTRA ? values.rol_name || null : null,
      };

      const res = await fetch(editId ? `/api/users/${editId}` : "/api/users", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg = j.message || j.errors?.email?.[0] || "Error al guardar el usuario.";
        setError(msg);
        return;
      }

      await refresh();
      setFormOpen(false);
    } catch (e) {
      console.error(e);
      setError("Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${deleteId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.message || "No se pudo eliminar el usuario.");
        return;
      }
      await refresh();
      setDeleteId(null);
    } catch (e) {
      console.error(e);
      alert("Error inesperado.");
    } finally {
      setDeleting(false);
    }
  }

  async function refresh() {
    const res = await fetch("/api/users");
    if (res.ok) {
      const j = await res.json();
      setData((prev) => ({ ...prev, users: j.users }));
    }
  }

  const targetToDelete = deleteId ? data.users.find((u) => u.id === deleteId) : null;

  function exportToExcel() {
    const rows = filteredUsers.map((u) => ({
      Nombre: [u.nombre, u.apellido].filter(Boolean).join(" ") || "Sin nombre",
      Email: u.email,
      Rol: roleLabel[u.role],
      "Rol DB": u.roles?.name ?? "—",
      "Módulos asignados": u.role === UserRole.CLIENTE ? "—" : String(moduleIdsForUser(u).length),
      "Cliente vinculado": u.Customer?.name ?? "—",
      Estado: u.status === "ACTIVE" ? "Activo" : u.status === "INACTIVE" ? "Inactivo" : "Bloqueado",
      "Fecha creación": new Date(u.created_at).toLocaleDateString("es-VE"),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Usuarios");
    XLSX.writeFile(wb, `usuarios_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const filteredUsers = data.users.filter((user) => {
    const matchesSearch =
      searchQuery === "" ||
      [user.email, user.nombre, user.apellido, roleLabel[user.role], user.roles?.name]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = filterRole === "ALL" || user.role === filterRole;
    const matchesStatus = filterStatus === "ALL" || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="space-y-0 pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-tight shrink-0">
            Listado de Usuarios
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, correo"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-8 h-8 w-52 text-xs"
              />
            </div>
            <Select value={filterRole} onValueChange={(v) => { setFilterRole(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 w-36 text-xs shrink-0">
                <SelectValue placeholder="Tipos de usuarios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tipos de usuarios</SelectItem>
                <SelectItem value={UserRole.MASSIVA_ADMIN}>Administrador</SelectItem>
                <SelectItem value={UserRole.MASSIVA_EXTRA}>Extra</SelectItem>
                <SelectItem value={UserRole.CLIENTE}>Cliente</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 w-32 text-xs shrink-0">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="ACTIVE">Activo</SelectItem>
                <SelectItem value="INACTIVE">Inactivo</SelectItem>
                <SelectItem value="BLOCKED">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              disabled={filteredUsers.length === 0}
              className="h-8 text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Exportar Excel
            </Button>
            <Button size="sm" onClick={openCreate} className="bg-cyan-600 hover:bg-cyan-700 shrink-0 h-8">
              <UserPlus className="mr-2 h-3.5 w-3.5" /> Nuevo Usuario
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredUsers.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">
            {data.users.length === 0 ? "Sin usuarios registrados." : "No se encontraron usuarios con esos filtros."}
          </p>
        ) : (
          <>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-bold uppercase text-slate-400">Usuario</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-slate-400">Rol</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-slate-400">Módulos</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-slate-400">Cliente Vinculado</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-slate-400">Estado</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase text-slate-400">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((user) => {
                const moduleCount = moduleIdsForUser(user).length;
                const canEdit = isAdmin || user.role !== UserRole.MASSIVA_ADMIN;
                const canDelete = isAdmin || user.role !== UserRole.MASSIVA_ADMIN;
                return (
                  <TableRow key={user.id} className="border-slate-100">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-slate-100 rounded-lg">
                          <ShieldCheck className="h-4 w-4 text-cyan-600" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">
                            {[user.nombre, user.apellido].filter(Boolean).join(" ") || "Sin nombre"}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <Badge className={`text-[8px] font-black uppercase px-1.5 h-4 border-none ${roleBadgeColor(user.role)}`}>
                          {roleLabel[user.role]}
                        </Badge>
                        {user.roles && (
                          <span className="text-[10px] text-slate-400">{user.roles.name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">
                        {user.role === UserRole.CLIENTE ? "—" : `${moduleCount} módulos`}
                      </span>
                    </TableCell>
                    <TableCell>
                      {user.Customer ? (
                        <span className="text-xs text-cyan-700 font-medium">{user.Customer.name}</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[8px] font-black uppercase px-1.5 h-4 border-none ${user.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : user.status === "BLOCKED" ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-600"}`}>
                        {user.status === "ACTIVE" ? "Activo" : user.status === "BLOCKED" ? "Bloqueado" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel className="text-xs text-slate-500">
                            {user.email}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {canEdit && (
                            <DropdownMenuItem onClick={() => openEdit(user)}>
                              <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleteId(user.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                          )}
                          {!canEdit && (
                            <p className="px-2 py-1.5 text-[10px] text-slate-400">
                              Solo un admin puede editar admins.
                            </p>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filteredUsers.length > ITEMS_PER_PAGE ? (
            <DataPagination
              currentPage={currentPage}
              totalItems={filteredUsers.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          ) : null}
          </>
        )}
      </CardContent>

      {/* Modal de creación/edición */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
            <DialogDescription>
              Rellena los datos del usuario. Los campos marcados son obligatorios.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electrónico *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="usuario@empresa.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de usuario *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v as UserRole);
                          form.setValue("modules", []);
                          form.setValue("customerId", "");
                          form.setValue("rol_name", "");
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona tipo de usuario" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isAdmin && <SelectItem value={UserRole.MASSIVA_ADMIN}>Administrador</SelectItem>}
                          <SelectItem value={UserRole.MASSIVA_EXTRA}>Extra</SelectItem>
                          <SelectItem value={UserRole.CLIENTE}>Cliente</SelectItem>
                        </SelectContent>
                      </Select>
                      {!isAdmin && (
                        <p className="text-[10px] text-slate-400">Solo un administrador puede asignar el rol de Administrador.</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apellido"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido</FormLabel>
                      <FormControl>
                        <Input placeholder="Apellido" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
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
                  control={form.control}
                  name="cargo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo</FormLabel>
                      <FormControl>
                        <Input placeholder="Cargo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div style={{ display: watchRole === UserRole.MASSIVA_EXTRA ? "block" : "none" }}>
                  <FormField
                    control={form.control}
                    name="rol_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rol</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre del rol" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel className="text-sm font-medium">Estado del usuario</FormLabel>
                        <p className="text-xs text-slate-400">Controla el acceso y visibilidad del usuario.</p>
                      </div>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v);
                            form.setValue("is_active", v === "ACTIVE");
                          }}
                        >
                          <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Activo</SelectItem>
                            <SelectItem value="INACTIVE">Inactivo</SelectItem>
                            <SelectItem value="BLOCKED">Bloqueado</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />

              {editId && (
                <FormField
                  control={form.control}
                  name="resetPassword"
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-2 rounded-lg border p-3">
                        <FormLabel>Restablecer contraseña</FormLabel>
                        <FormControl>
                          <Input placeholder="Dejar vacío para no cambiar" {...field} />
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              )}

              {watchRole === UserRole.MASSIVA_EXTRA && (
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <UserRoundCog className="h-4 w-4 text-cyan-600" />
                    <p className="text-sm font-medium">Módulos de acceso</p>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Configura los módulos a los que este usuario podrá acceder. Se creará un rol dedicado por usuario.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {data.modulos.filter((mod) => !EXCLUDED_MODULE_NAMES.includes(mod.name)).map((mod) => {
                      const checked = watchModules.includes(mod.id);
                      return (
                        <label
                          key={mod.id}
                          className={`flex items-start gap-2 rounded-md border p-2 cursor-pointer transition-colors ${
                            checked ? "border-cyan-500 bg-cyan-50" : "border-slate-200"
                          }`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(val) => {
                              const current = form.getValues("modules");
                              const next = val ? [...current, mod.id] : current.filter((m) => m !== mod.id);
                              form.setValue("modules", next, { shouldValidate: true });
                            }}
                          />
                          <div>
                            <p className="text-xs font-medium">{mod.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{mod.path}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {watchRole === UserRole.CLIENTE && (
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-2 rounded-lg border p-3">
                        <FormLabel>Enlazar Cliente</FormLabel>
                        <Select
                          value={field.value || "none"}
                          onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecciona un cliente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">— Ninguno —</SelectItem>
                            {data.customers.map((c) => (
                              <SelectItem
                                key={c.id}
                                value={c.id}
                                disabled={customerTaken(c.id, editId ?? undefined)}
                              >
                                {c.name} ({c.doc_number})
                                {c.user_id ? " — ya tiene usuario" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[11px] text-slate-400">
                          Cada cliente solo puede estar vinculado a un usuario.
                        </p>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              )}

              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading || !form.formState.isValid} className="bg-cyan-600 hover:bg-cyan-700">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editId ? "Guardar Cambios" : "Crear Usuario"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              {targetToDelete ? (
                <>
                  Se eliminará a <strong>{targetToDelete.email}</strong>
                  {targetToDelete.role === UserRole.CLIENTE && " y se desvinculará de su cliente."}
                  {targetToDelete.role === UserRole.MASSIVA_ADMIN && " Es un administrador."}
                  {" "}Esta acción no se puede deshacer.
                </>
              ) : (
                "Esta acción no se puede deshacer."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}