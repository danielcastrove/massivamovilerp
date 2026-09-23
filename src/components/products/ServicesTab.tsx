"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Loader, AlertCircle, Pencil, Trash2, Search } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ServiceForm } from "./ServiceForm";
import * as z from "zod";
import { ProductType, BillingCycle } from "@prisma/client";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ProductsExportModal } from "./ProductsExportModal"; // Import the new modal
import { DataPagination } from "@/components/ui/data-pagination";

interface Product {
  id: string;
  sku: string;
  name: string;
  type: ProductType;
  billing_cycle: BillingCycle | null;
  category: {
    id: string;
    name: string;
  };
}

const typeDisplay: { [key: string]: string } = {
  RECURRENT: "Recurrente",
  ONE_TIME: "Única Vez",
};

const cycleDisplay: { [key: string]: string } = {
  MONTHLY: "Mensual",
  BIMONTHLY: "Bimensual",
};

const formSchema = z.object({
  name: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
  type: z.nativeEnum(ProductType),
  billing_cycle: z.nativeEnum(BillingCycle).nullable(),
}).refine(data => data.type !== 'RECURRENT' || data.billing_cycle !== null, {
    message: "El ciclo de facturación es obligatorio para productos recurrentes.",
    path: ["billing_cycle"],
});

export function ServicesTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog and submission states
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Product | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  // State for Export Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Filter states
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);

      const productsRes = await fetch('/api/products');
      
      if (!productsRes.ok) throw new Error("No se pudieron cargar los servicios.");
      
      const productsData: Product[] = await productsRes.json();
      
      setProducts(productsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear el servicio.");
      }
      await fetchData();
      setCreateDialogOpen(false);
    } catch (error: any) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!editingService) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch(`/api/products/${editingService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al actualizar el servicio.");
      }
      await fetchData();
      setEditDialogOpen(false);
    } catch (error: any) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingServiceId) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch(`/api/products/${deletingServiceId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al eliminar el servicio.");
      }
      await fetchData();
      setDeleteDialogOpen(false);
    } catch (error: any) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (service: Product) => {
    setEditingService(service);
    setSubmitError(null);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (id: string) => {
    setDeletingServiceId(id);
    setSubmitError(null);
    setDeleteDialogOpen(true);
  };

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach(p => {
      if (p.category?.id && !map.has(p.category.id)) map.set(p.category.id, p.category.name);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (typeFilter !== "ALL" && p.type !== typeFilter) return false;
      if (categoryFilter !== "ALL" && p.category?.id !== categoryFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchName = p.name?.toLowerCase().includes(term);
        const matchSku = p.sku?.toLowerCase().includes(term);
        if (!matchName && !matchSku) return false;
      }
      return true;
    });
  }, [products, typeFilter, categoryFilter, searchTerm]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);



  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Servicios</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Cargando servicios...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle>Servicios</CardTitle></CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-40 text-red-600">
          <AlertCircle className="h-8 w-8 mb-2" />
          <span>Error: {error}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Servicio</DialogTitle>
            <DialogDescription>Añade un nuevo producto o servicio al sistema.</DialogDescription>
          </DialogHeader>
          {submitError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{submitError}</AlertDescription></Alert>}
          <ServiceForm onSubmit={handleCreateSubmit} isSubmitting={isSubmitting} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Servicio</DialogTitle>
            <DialogDescription>Modifica los detalles del servicio.</DialogDescription>
          </DialogHeader>
          {submitError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{submitError}</AlertDescription></Alert>}
          <ServiceForm onSubmit={handleEditSubmit} isSubmitting={isSubmitting} defaultValues={editingService || undefined} />
        </DialogContent>
      </Dialog>
      
      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Servicio</DialogTitle>
            <DialogDescription>¿Estás seguro? Esta acción es irreversible.</DialogDescription>
          </DialogHeader>
          {submitError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{submitError}</AlertDescription></Alert>}
          <DialogFooter className="mt-4">
            <Button className="bg-cyan-500 hover:bg-cyan-600 text-white" onClick={() => setDeleteDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>{isSubmitting ? <><Loader className="mr-2 h-4 w-4 animate-spin" />Eliminando...</> : "Eliminar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Products Export Modal */}
      <ProductsExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        products={filteredProducts}
      />

      <Card>
        <CardHeader>
          <CardTitle>Servicios</CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o SKU"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-8 h-8 w-52 text-xs"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 w-[150px] text-xs text-slate-600"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="RECURRENT">Recurrente</SelectItem>
                <SelectItem value="ONE_TIME">Única Vez</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 w-[180px] text-xs text-slate-600"><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Categoría</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="bg-cyan-500 hover:bg-cyan-600 text-white h-8 text-xs"
              onClick={() => setIsExportModalOpen(true)}
              disabled={loading}
            >
              Exportar Productos
            </Button>
            <Button
              className="bg-cyan-500 hover:bg-cyan-600 text-white h-8 text-xs"
              onClick={() => setCreateDialogOpen(true)}
              disabled={loading}
            >
              Crear Nuevo Servicio
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader className="h-10 w-10 animate-spin text-cyan-600 mb-4" />
              <p className="text-muted-foreground font-medium animate-pulse">Sincronizando servicios...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No hay servicios que coincidan con el filtro.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nombre del Servicio</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ciclo de Facturación</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((service) => {
                  return (
                    <TableRow key={service.id}>
                      <TableCell className="font-mono text-xs font-bold text-cyan-600">{service.sku || "N/A"}</TableCell>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>{service.category ? service.category.name : "N/A"}</TableCell>
                      <TableCell>{typeDisplay[service.type] || "N/A"}</TableCell>
                      <TableCell>{service.billing_cycle ? cycleDisplay[service.billing_cycle] : "N/A"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEditDialog(service)}>
                              <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500" onClick={() => openDeleteDialog(service.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {filteredProducts.length > ITEMS_PER_PAGE && (
            <DataPagination
              currentPage={currentPage}
              totalItems={filteredProducts.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}