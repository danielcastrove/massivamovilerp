"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, FileText, Download, Loader2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { pdf } from "@react-pdf/renderer";
import InvoicePDF from "./InvoicePDF";

interface Invoice {
  id: string;
  customer: {
    name: string;
    doc_number: string;
    direccion_fiscal?: string;
  };
  type: "FACTURA" | "RECIBO";
  status: "DRAFT" | "SENT" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED";
  issue_date: string;
  due_date: string;
  total_usd: number;
  total_bs: number;
  currency_rate: number;
  subtotal_usd: number;
  tax_amount_usd: number;
  retention_amount_bs: number;
  invoice_items: any[];
}

// Sub-component for individual row actions to keep main component clean
const InvoiceActionButtons = ({ invoice }: { invoice: Invoice }) => {
  const [generating, setGenerating] = useState(false);

  const handleGeneratePDF = async (action: 'view' | 'download') => {
    setGenerating(true);
    try {
      const doc = <InvoicePDF invoice={invoice} />;
      const asBlob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(asBlob);
      
      if (action === 'view') {
        window.open(url, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${invoice.type}_${invoice.id.slice(0, 8)}.pdf`;
        link.click();
      }
      
      // Cleanup
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error al generar el PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex justify-end gap-2">
      <Button 
        variant="ghost" 
        size="icon" 
        title="Ver PDF"
        onClick={() => handleGeneratePDF('view')}
        disabled={generating}
      >
        {generating ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <FileText className="h-4 w-4 text-slate-500" />}
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        title="Descargar"
        onClick={() => handleGeneratePDF('download')}
        disabled={generating}
      >
        {generating ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <Download className="h-4 w-4 text-slate-500" />}
      </Button>
    </div>
  );
};

export default function InvoicePageClient() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const response = await fetch("/api/invoices");
        if (response.ok) {
          const data = await response.json();
          setInvoices(data);
        }
      } catch (error) {
        console.error("Failed to fetch invoices:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchInvoices();
  }, []);

  const filteredInvoices = invoices.filter((invoice) =>
    invoice.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: Invoice["status"]) => {
    const statusStyles: Record<Invoice["status"], string> = {
      DRAFT: "bg-gray-100 text-gray-800",
      SENT: "bg-blue-100 text-blue-800",
      PARTIAL: "bg-amber-100 text-amber-800",
      PAID: "bg-green-100 text-green-800",
      OVERDUE: "bg-red-100 text-red-800",
      CANCELLED: "bg-slate-100 text-slate-800",
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Facturación</h1>
          <p className="text-slate-500">Gestione sus facturas, recibos y retenciones.</p>
        </div>
        <Link href="/dashboard/facturacion/nueva">
          <Button className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2 transition-all">
            <Plus className="h-4 w-4" /> Nueva Factura
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por cliente o número de factura..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead className="w-[120px]">Nro. Factura</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fecha Emisión</TableHead>
              <TableHead>Monto USD</TableHead>
              <TableHead>Monto Bs</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-slate-500">
                  Cargando facturas...
                </TableCell>
              </TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-slate-500">
                  No se encontraron facturas.
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-mono text-xs text-slate-600">
                    #{invoice.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="font-medium">{invoice.customer.name}</TableCell>
                  <TableCell>{invoice.type}</TableCell>
                  <TableCell>
                    {format(new Date(invoice.issue_date), "dd MMM yyyy", { locale: es })}
                  </TableCell>
                  <TableCell>${Number(invoice.total_usd).toFixed(2)}</TableCell>
                  <TableCell>Bs {Number(invoice.total_bs).toLocaleString("es-VE", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell className="text-right">
                    <InvoiceActionButtons invoice={invoice} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
