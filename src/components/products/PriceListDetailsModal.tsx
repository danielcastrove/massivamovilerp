// massivamovilerp/src/components/products/PriceListDetailsModal.tsx
"use client";

import * as React from "react";
import * as XLSX from 'xlsx'; // Import xlsx library
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter, // Import DialogFooter for button placement
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader, AlertCircle, Download } from "lucide-react"; // Import Download icon
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button"; // Import Button

interface ProductPriceDetail {
    product_id: string;
    price_usd: number;
    approx_price_bs: number | null;
    product: {
        id: string;
        name: string;
        category: {
            id: string;
            name: string;
        } | null;
    };
    priceList: { // Include priceList details here for consistency with the API response
      id: string;
      name: string;
    };
}

interface PriceListDetailsModalProps {
  priceListId: string | null;
  priceListName: string; // Price list name is now a required prop
  isOpen: boolean;
  onClose: () => void;
}

export function PriceListDetailsModal({
  priceListId,
  priceListName,
  isOpen,
  onClose,
}: PriceListDetailsModalProps) {
  const [productPrices, setProductPrices] = React.useState<ProductPriceDetail[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen || !priceListId) {
      setProductPrices([]);
      return;
    }

    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/productprices?price_list_id=${priceListId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch price list details.");
        }
        const data: ProductPriceDetail[] = await response.json();
        setProductPrices(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred.");
        }
        console.error("Error fetching price list details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, priceListId]);

  const handleExport = () => {
    if (!productPrices || productPrices.length === 0) {
      // Optionally show a message to the user that there's no data to export
      return;
    }

    const dataToExport = productPrices.map(item => ({
      'Producto': item.product.name,
      'Categoría': item.product.category?.name || 'N/A',
      'Precio (USD)': item.price_usd.toFixed(2),
      'Precio Aprox. (Bs)': formatCurrency(item.approx_price_bs),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lista de Precios");

    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const filename = `${priceListName.replace(/\s+/g, '_')}_${date}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[700px]">
        <DialogHeader className="flex flex-row items-center justify-between"> {/* Adjusted for button */}
          <div>
            <DialogTitle>Detalles de Lista de Precios: {priceListName}</DialogTitle>
            <DialogDescription>
              Aquí puedes ver todos los productos asociados a esta lista de precios y sus valores.
            </DialogDescription>
          </div>
          <Button onClick={handleExport} disabled={productPrices.length === 0 || isLoading} className="bg-cyan-500 hover:bg-cyan-600 text-white">
            <Download className="mr-2 h-4 w-4" /> Exportar a Excel
          </Button>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Cargando detalles de la lista...</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {productPrices && !isLoading && !error && (
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Precio (USD)</TableHead>
                  <TableHead className="text-right">Precio Aprox. (Bs)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productPrices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No hay productos asignados a esta lista de precios.
                    </TableCell>
                  </TableRow>
                ) : (
                  productPrices.map((item) => (
                    <TableRow key={item.product_id}>
                      <TableCell className="font-medium">{item.product.name}</TableCell>
                      <TableCell>{item.product.category?.name || 'N/A'}</TableCell>
                      <TableCell>${item.price_usd.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.approx_price_bs)}</TableCell>
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
