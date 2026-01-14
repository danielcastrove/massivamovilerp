// massivamovilerp/src/components/products/ProductsExportModal.tsx
"use client";

import * as React from "react";
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader, AlertCircle, Download } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ProductType, BillingCycle } from "@prisma/client";

interface ProductDetail {
    id: string;
    name: string;
    type: ProductType;
    billing_cycle: BillingCycle | null;
    categoryId: string | null;
    category: {
        id: string;
        name: string;
    } | null;
}

interface ProductsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProductsExportModal({
  isOpen,
  onClose,
}: ProductsExportModalProps) {
  const [products, setProducts] = React.useState<ProductDetail[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setProducts([]);
      return;
    }

    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/products`);
        if (!response.ok) {
          throw new Error("Failed to fetch products.");
        }
        const data: ProductDetail[] = await response.json();
        setProducts(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred.");
        }
        console.error("Error fetching products:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [isOpen]);

  const handleExport = () => {
    if (!products || products.length === 0) {
      return;
    }

    const dataToExport = products.map(item => ({
      'ID Producto': item.id,
      'Nombre': item.name,
      'Tipo': item.type === ProductType.RECURRENT ? 'Recurrente' : 'Única Vez',
      'Ciclo Facturación': item.billing_cycle || 'N/A',
      'Categoría': item.category?.name || 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");

    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const filename = `Productos_${date}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const typeDisplay: { [key: string]: string } = {
    RECURRENT: "Recurrente",
    ONE_TIME: "Única Vez",
  };
  
  const cycleDisplay: { [key: string]: string } = {
    MONTHLY: "Mensual",
    BIMONTHLY: "Bimensual",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[800px]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle>Listado de Productos</DialogTitle>
            <DialogDescription>
              Aquí puedes ver un listado completo de todos los productos registrados en el sistema y exportarlos a Excel.
            </DialogDescription>
          </div>
          <Button onClick={handleExport} disabled={products.length === 0 || isLoading} className="bg-cyan-500 hover:bg-cyan-600 text-white">
            <Download className="mr-2 h-4 w-4" /> Exportar a Excel
          </Button>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Cargando productos...</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {products && !isLoading && !error && (
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ciclo</TableHead>
                  <TableHead>Categoría</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No hay productos disponibles.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{typeDisplay[item.type] || 'N/A'}</TableCell>
                      <TableCell>{item.billing_cycle ? cycleDisplay[item.billing_cycle] : 'N/A'}</TableCell>
                      <TableCell>{item.category?.name || 'N/A'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}