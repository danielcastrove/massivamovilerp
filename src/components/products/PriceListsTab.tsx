"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Loader, AlertCircle, Trash2, Eye, Pencil, Search } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"; // Added DialogFooter
import { PriceListForm } from "./PriceListForm";
import * as z from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PriceListDetailsModal } from "./PriceListDetailsModal";
import { DataPagination } from "@/components/ui/data-pagination";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
  url: z.union([z.string().url("Ingresa una URL válida."), z.literal("")]).optional(),
});

interface PriceList {
  id: string;
  name: string;
  url?: string | null;
}

export function PriceListsTab() {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for Create Dialog
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  
  // State for Edit Dialog
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPriceList, setEditingPriceList] = useState<PriceList | null>(null);

  // State for Delete Dialog
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPriceListId, setDeletingPriceListId] = useState<string | null>(null);
  
  // State for PriceList Details Modal
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPriceListId, setSelectedPriceListId] = useState<string | null>(null);
  const [selectedPriceListName, setSelectedPriceListName] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  async function fetchPriceLists() {
    try {
      setLoading(true);
      const response = await fetch("/api/pricelists");
      if (!response.ok) {
        throw new Error("No se pudieron cargar las listas de precios.");
      }
      const data: PriceList[] = await response.json();
      setPriceLists(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPriceLists();
  }, []);

  const handleCreateSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch('/api/pricelists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear la lista de precios.");
      }

      await fetchPriceLists();
      setCreateDialogOpen(false);

    } catch (error: any) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEditSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!editingPriceList) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch(`/api/pricelists/${editingPriceList.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al actualizar la lista de precios.");
      }

      await fetchPriceLists();
      setEditDialogOpen(false);
      setEditingPriceList(null);

    } catch (error: any) {
      setSubmitError(error.message);
    }
    finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (priceList: PriceList) => {
    setEditingPriceList(priceList);
    setSubmitError(null); // Clear previous submit errors
    setEditDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingPriceListId) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch(`/api/pricelists/${deletingPriceListId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al eliminar la lista de precios.");
      }

      await fetchPriceLists();
      setDeleteDialogOpen(false);
      setDeletingPriceListId(null);

    } catch (error: any) {
      setSubmitError(error.message);
    }
    finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteDialog = (id: string) => {
    setDeletingPriceListId(id);
    setSubmitError(null); // Clear previous submit errors
    setDeleteDialogOpen(true);
  };

  const openDetailsModal = (priceList: PriceList) => {
    setSelectedPriceListId(priceList.id);
    setSelectedPriceListName(priceList.name);
    setDetailsModalOpen(true);
  };

  const filteredPriceLists = useMemo(() => {
    if (!searchTerm) return priceLists;
    const term = searchTerm.toLowerCase();
    return priceLists.filter((list) => {
      const matchName = list.name?.toLowerCase().includes(term);
      const matchUrl = list.url?.toLowerCase().includes(term);
      return matchName || matchUrl;
    });
  }, [priceLists, searchTerm]);

  const paginatedPriceLists = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPriceLists.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPriceLists, currentPage]);


  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Listas de Precios</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Cargando listas...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Listas de Precios</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-40 text-red-600">
          <AlertCircle className="h-8 w-8 mb-2" />
          <span>Error: {error}</span>
          <Button variant="outline" className="mt-4" onClick={fetchPriceLists}>Reintentar</Button>
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
            <DialogTitle>Crear Nueva Lista de Precios</DialogTitle>
            <DialogDescription>
              Dale un nombre único a tu nueva lista de precios.
            </DialogDescription>
          </DialogHeader>
          {submitError && !isEditDialogOpen && !isDeleteDialogOpen && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          <PriceListForm 
            onSubmit={handleCreateSubmit}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Lista de Precios</DialogTitle>
            <DialogDescription>
              Modifica el nombre de la lista de precios.
            </DialogDescription>
          </DialogHeader>
          {submitError && isEditDialogOpen && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          <PriceListForm 
            onSubmit={handleEditSubmit}
            isSubmitting={isSubmitting}
            defaultValues={{ name: editingPriceList?.name || '', url: editingPriceList?.url || '' }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Lista de Precios</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar esta lista de precios? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          {submitError && isDeleteDialogOpen && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter className="mt-4">
            <Button className="bg-cyan-500 hover:bg-cyan-600 text-white" onClick={() => setDeleteDialogOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PriceList Details Modal */}
      <PriceListDetailsModal
        priceListId={selectedPriceListId}
        priceListName={selectedPriceListName}
        isOpen={isDetailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Listas de Precios</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre o URL"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="pl-8 h-8 w-52 text-xs"
                />
              </div>
              <Button 
                className="bg-cyan-500 hover:bg-cyan-600 text-white" 
                onClick={() => setCreateDialogOpen(true)}
                disabled={loading}
              >
                Crear Nueva Lista
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader className="h-10 w-10 animate-spin text-cyan-600 mb-4" />
              <p className="text-muted-foreground font-medium animate-pulse">Sincronizando listas de precios...</p>
            </div>
          ) : filteredPriceLists.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              No hay listas de precios que coincidan con la búsqueda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">Nombre de la Lista</TableHead>
                  <TableHead className="text-left">URL</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPriceLists.map((list) => (
                  <TableRow key={list.id}>
                    <TableCell className="font-medium">{list.name}</TableCell>
                    <TableCell>
                      {list.url ? (
                        <a href={list.url} target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline text-sm">
                          {list.url}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openDetailsModal(list)}>
                              <Eye className="mr-2 h-4 w-4" /> Ver
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(list)}>
                              <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500" onClick={() => openDeleteDialog(list.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filteredPriceLists.length > ITEMS_PER_PAGE && (
            <DataPagination
              currentPage={currentPage}
              totalItems={filteredPriceLists.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
