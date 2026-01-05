"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Loader, AlertCircle, Trash2 } from "lucide-react"; // Added Trash2
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"; // Added DialogFooter
import { PriceListForm } from "./PriceListForm";
import * as z from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
});

interface PriceList {
  id: string;
  name: string;
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
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
            defaultValues={{ name: editingPriceList?.name || '' }}
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
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isSubmitting}>
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


      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Listas de Precios</CardTitle>
            <Button onClick={() => setCreateDialogOpen(true)}>Crear Nueva Lista</Button>
          </div>
        </CardHeader>
        <CardContent>
          {priceLists.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              No hay listas de precios disponibles.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre de la Lista</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceLists.map((list) => (
                  <TableRow key={list.id}>
                    <TableCell className="font-medium">{list.name}</TableCell>
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
                          <DropdownMenuItem onClick={() => openEditDialog(list)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500" onClick={() => openDeleteDialog(list.id)}>
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
