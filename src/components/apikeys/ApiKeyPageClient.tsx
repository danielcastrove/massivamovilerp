"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Key,
  Plus,
  MoreVertical,
  Eye,
  Pencil,
  Ban,
  Power,
  PowerOff,
  Copy,
  Check,
  Shield,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface ApiKeyRecord {
  id: string;
  name: string;
  key_prefix: string;
  description?: string | null;
  allowed_endpoints: string[];
  is_active: boolean;
  expires_at?: string | null;
  rate_limit?: number | null;
  created_at: string;
}

interface ApiKeyPageClientProps {
  initialApiKeys: ApiKeyRecord[];
}

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

const AVAILABLE_ENDPOINTS = [
  {
    label: "Clientes",
    path: "/api/customers",
    methods: ["GET", "POST", "PUT", "DELETE"] as HttpMethod[],
  },
  {
    label: "Facturas",
    path: "/api/invoices",
    methods: ["GET", "POST", "PUT", "DELETE"] as HttpMethod[],
  },
  {
    label: "Productos",
    path: "/api/products",
    methods: ["GET", "POST", "PUT", "DELETE"] as HttpMethod[],
  },
  {
    label: "Listas de Precios",
    path: "/api/productprices",
    methods: ["GET", "POST", "PUT", "DELETE"] as HttpMethod[],
  },
  {
    label: "Pagos",
    path: "/api/payments",
    methods: ["GET", "POST", "PUT", "DELETE"] as HttpMethod[],
  },
  {
    label: "Leads",
    path: "/api/leads",
    methods: ["GET", "POST", "PUT", "DELETE"] as HttpMethod[],
  },
  {
    label: "Categorías",
    path: "/api/categories",
    methods: ["GET", "POST", "PUT", "DELETE"] as HttpMethod[],
  },
];

export default function ApiKeyPageClient({ initialApiKeys }: ApiKeyPageClientProps) {
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>(initialApiKeys);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKeyRecord | null>(null);
  const [newRawKey, setNewRawKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formEndpoints, setFormEndpoints] = useState<string[]>([]);
  const [formExpiresAt, setFormExpiresAt] = useState("");
  const [formRateLimit, setFormRateLimit] = useState("");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormEndpoints([]);
    setFormExpiresAt("");
    setFormRateLimit("");
  };

  const handleCreate = async () => {
    if (!formName.trim() || formEndpoints.length === 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/apikeys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: formDescription || null,
          allowed_endpoints: formEndpoints,
          expires_at: formExpiresAt || null,
          rate_limit: formRateLimit ? Number(formRateLimit) : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewRawKey(data.raw_key);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { raw_key: _, ...keyRecord } = data;
        setApiKeys((prev) => [keyRecord, ...prev]);
        setIsCreateOpen(false);
        setIsViewOpen(true);
        resetForm();
      }
    } catch (e) {
      console.error("Error creating API key:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedKey || !formName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/apikeys/${selectedKey.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: formDescription || null,
          allowed_endpoints: formEndpoints,
          expires_at: formExpiresAt || null,
          rate_limit: formRateLimit ? Number(formRateLimit) : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setApiKeys((prev) => prev.map((k) => (k.id === data.id ? data : k)));
        setIsEditOpen(false);
        setSelectedKey(null);
        resetForm();
      }
    } catch (e) {
      console.error("Error updating API key:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (key: ApiKeyRecord) => {
    try {
      const res = await fetch(`/api/apikeys/${key.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !key.is_active }),
      });

      if (res.ok) {
        const data = await res.json();
        setApiKeys((prev) => prev.map((k) => (k.id === data.id ? data : k)));
      }
    } catch (e) {
      console.error("Error toggling API key:", e);
    }
  };

  const handleRevoke = async () => {
    if (!selectedKey) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/apikeys/${selectedKey.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowed_endpoints: [], is_active: false }),
      });

      if (res.ok) {
        const data = await res.json();
        setApiKeys((prev) => prev.map((k) => (k.id === data.id ? data : k)));
        setIsRevokeOpen(false);
        setSelectedKey(null);
      }
    } catch (e) {
      console.error("Error revoking API key:", e);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (key: ApiKeyRecord) => {
    setSelectedKey(key);
    setFormName(key.name);
    setFormDescription(key.description || "");
    setFormEndpoints(key.allowed_endpoints);
    setFormExpiresAt(key.expires_at ? key.expires_at.split("T")[0] : "");
    setFormRateLimit(key.rate_limit?.toString() || "");
    setIsEditOpen(true);
  };

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleEndpoint = (path: string, method?: HttpMethod) => {
    const endpoint = method ? `${method}:${path}/*` : `${path}/*`;
    setFormEndpoints((prev) =>
      prev.includes(endpoint) ? prev.filter((e) => e !== endpoint) : [...prev, endpoint]
    );
  };

  const toggleModule = (mod: (typeof AVAILABLE_ENDPOINTS)[number]) => {
    setFormEndpoints((prev) => {
      const allEndpoints = mod.methods.map((m) => `${m}:${mod.path}/*`);
      const allSelected = allEndpoints.every((ep) => prev.includes(ep));
      if (allSelected) {
        return prev.filter((ep) => !allEndpoints.includes(ep));
      }
      const withoutModule = prev.filter((ep) => !allEndpoints.includes(ep));
      return [...withoutModule, ...allEndpoints];
    });
  };

  const toggleModuleExpand = (label: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const isModuleSelected = (mod: (typeof AVAILABLE_ENDPOINTS)[number]) => {
    return mod.methods.every((m) => formEndpoints.includes(`${m}:${mod.path}/*`));
  };

  const isModulePartial = (mod: (typeof AVAILABLE_ENDPOINTS)[number]) => {
    const any = mod.methods.some((m) => formEndpoints.includes(`${m}:${mod.path}/*`));
    return any && !isModuleSelected(mod);
  };

  const isExpired = (expiresAt?: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Key className="h-6 w-6 text-violet-600" />
            Gestor de API Keys
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administra las API keys para acceso externo de páginas aliadas
          </p>
        </div>
        <Button onClick={openCreate} className="bg-violet-600 hover:bg-violet-700">
          <Plus className="h-4 w-4 mr-2" /> Nueva API Key
        </Button>
      </div>

      {/* Table */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Nombre</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Estado</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Endpoints</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Expiración</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Rate Limit</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Creada</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    No hay API keys creadas
                  </TableCell>
                </TableRow>
              ) : (
                apiKeys.map((key) => (
                  <TableRow key={key.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium text-sm">{key.name}</TableCell>
                    <TableCell>
                      {isExpired(key.expires_at) ? (
                        <Badge className="bg-red-100 text-red-700 text-[9px]">Expirada</Badge>
                      ) : key.is_active ? (
                        <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">Activa</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-500 text-[9px]">Inactiva</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {key.allowed_endpoints.slice(0, 3).map((ep) => {
                          const method = ep.includes(":") ? ep.split(":")[0] : null;
                          const path = ep.includes(":") ? ep.split(":")[1] : ep;
                          const color =
                            method === "GET"
                              ? "bg-emerald-50 text-emerald-700"
                              : method === "POST"
                                ? "bg-blue-50 text-blue-700"
                                : method === "PUT"
                                  ? "bg-amber-50 text-amber-700"
                                  : method === "DELETE"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-violet-50 text-violet-700";
                          return (
                            <Badge key={ep} className={`${color} text-[8px] font-mono`}>
                              {method ? `${method} ${path}` : path}
                            </Badge>
                          );
                        })}
                        {key.allowed_endpoints.length > 3 && (
                          <Badge className="bg-slate-100 text-slate-500 text-[8px]">
                            +{key.allowed_endpoints.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {key.expires_at
                        ? format(new Date(key.expires_at), "dd MMM yyyy", { locale: es })
                        : "Sin expiración"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {key.rate_limit ? `${key.rate_limit} req/min` : "Sin límite"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {format(new Date(key.created_at), "dd MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedKey(key);
                              setNewRawKey("");
                              setIsViewOpen(true);
                            }}
                            className="cursor-pointer"
                          >
                            <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(key)} className="cursor-pointer">
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleActive(key)}
                            className="cursor-pointer"
                          >
                            {key.is_active ? (
                              <>
                                <PowerOff className="mr-2 h-4 w-4 text-orange-500" /> Desactivar
                              </>
                            ) : (
                              <>
                                <Power className="mr-2 h-4 w-4 text-emerald-500" /> Activar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedKey(key);
                              setIsRevokeOpen(true);
                            }}
                            className="cursor-pointer text-red-600"
                          >
                            <Ban className="mr-2 h-4 w-4" /> Revocar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setIsEditOpen(false);
          setSelectedKey(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-violet-600" />
              {isEditOpen ? "Editar API Key" : "Nueva API Key"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-1 min-h-0">
            <div>
              <Label className="text-xs font-bold uppercase text-slate-400">Nombre</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Portal Aliado X"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase text-slate-400">Descripción</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descripción opcional..."
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase text-slate-400">Endpoints Permitidos</Label>
              <div className="mt-2 space-y-1">
                {AVAILABLE_ENDPOINTS.map((mod) => {
                  const expanded = expandedModules.has(mod.label);
                  return (
                    <div key={mod.path} className="border rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleModuleExpand(mod.label)}
                        className="w-full flex items-center gap-2 p-2.5 hover:bg-slate-50 text-left"
                      >
                        <input
                          type="checkbox"
                          checked={isModuleSelected(mod)}
                          ref={(el) => { if (el) el.indeterminate = isModulePartial(mod); }}
                          onChange={() => toggleModule(mod)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm font-medium">{mod.label}</span>
                        <code className="text-[10px] text-slate-400 font-mono">{mod.path}{"/" + "*"}</code>
                        <span className="ml-auto text-slate-400">
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </span>
                      </button>
                      {expanded && (
                        <div className="grid grid-cols-4 gap-1 px-2 pb-2 pt-0.5 bg-slate-50/50">
                          {mod.methods.map((m) => {
                            const ep = `${m}:${mod.path}/*`;
                            const checked = formEndpoints.includes(ep);
                            return (
                              <label
                                key={ep}
                                className={`flex items-center justify-center gap-1 cursor-pointer rounded-md px-2 py-1.5 text-[11px] font-mono border transition-colors ${
                                  checked
                                    ? m === "GET"
                                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                                      : m === "POST"
                                        ? "bg-blue-50 border-blue-300 text-blue-700"
                                        : m === "PUT"
                                          ? "bg-amber-50 border-amber-300 text-amber-700"
                                          : "bg-red-50 border-red-300 text-red-700"
                                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleEndpoint(mod.path, m)}
                                  className="sr-only"
                                />
                                {m}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold uppercase text-slate-400">Expiración (opcional)</Label>
                <Input
                  type="date"
                  value={formExpiresAt}
                  onChange={(e) => setFormExpiresAt(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase text-slate-400">Rate Limit (req/min)</Label>
                <Input
                  type="number"
                  value={formRateLimit}
                  onChange={(e) => setFormRateLimit(e.target.value)}
                  placeholder="Sin límite"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button
              onClick={isEditOpen ? handleEdit : handleCreate}
              disabled={loading || !formName.trim() || formEndpoints.length === 0}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {loading ? "Guardando..." : isEditOpen ? "Guardar Cambios" : "Crear API Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog — shows raw key on creation */}
      <Dialog open={isViewOpen} onOpenChange={(open) => {
        if (!open) {
          setIsViewOpen(false);
          setNewRawKey("");
          setSelectedKey(null);
        }
      }}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-violet-600" />
              {newRawKey ? "API Key Creada" : "Detalles de API Key"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-1 min-h-0">
            {newRawKey && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-xs font-bold text-amber-800 mb-2">
                  Guarda esta key. No volverá a mostrarse.
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-white border rounded px-3 py-2 flex-1 font-mono break-all">
                    {newRawKey}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(newRawKey)}
                    className="shrink-0"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
            {selectedKey && !newRawKey && (
              <div className="space-y-2 text-sm">
                <p><strong>Nombre:</strong> {selectedKey.name}</p>
                <p><strong>Estado:</strong> {selectedKey.is_active ? "Activa" : "Inactiva"}</p>
                <p><strong>Endpoints:</strong></p>
                <div className="flex flex-wrap gap-1 ml-4">
                  {selectedKey.allowed_endpoints.map((ep) => {
                    const method = ep.includes(":") ? ep.split(":")[0] : null;
                    const path = ep.includes(":") ? ep.split(":")[1] : ep;
                    const color =
                      method === "GET"
                        ? "bg-emerald-50 text-emerald-700"
                        : method === "POST"
                          ? "bg-blue-50 text-blue-700"
                          : method === "PUT"
                            ? "bg-amber-50 text-amber-700"
                            : method === "DELETE"
                              ? "bg-red-50 text-red-700"
                              : "bg-violet-50 text-violet-700";
                    return (
                      <Badge key={ep} className={`${color} text-[9px] font-mono`}>
                        {method ? `${method} ${path}` : path}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => { setIsViewOpen(false); setNewRawKey(""); }}>
              {newRawKey ? "Entendido" : "Cerrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation */}
      <AlertDialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revocar esta API key?</AlertDialogTitle>
            <AlertDialogDescription>
              La API key será desactivada y sus permisos eliminados, pero el registro se mantendrá en el sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={loading}
            >
              {loading ? "Revocando..." : "Revocar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
