"use client";

import React, { useState, useMemo } from "react";
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
import { Plus, Search, FileText, Download, Loader2, MoreVertical, Pencil, Trash, Receipt as ReceiptIcon, ArrowRight, History, Hash, Eye } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import InvoicePDF from "./InvoicePDF";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { DataPagination } from "@/components/ui/data-pagination";

interface Invoice {
  id: string;
  invoice_number?: number;
  control_number?: number;
  customer: {
    name: string;
    doc_number: string;
    direccion_fiscal?: string;
    persona_contacto_info?: any;
    telefono_empresa?: string;
    email?: string;
    porcent_retencion_iva?: number;
    porcent_retencion_islr?: number;
    porcent_retencion_municipio?: number;
  };
  type: "FACTURA" | "RECIBO";
  status: "DRAFT" | "SENT" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED";
  currency_mode?: string;
  issue_date: string;
  due_date: string;
  proximo_vencimiento_producto?: string | null;
  total_usd: number;
  total_bs: number;
  currency_rate: number;
  subtotal_usd: number;
  tax_amount_usd: number;
  igtf_amount_usd?: number;
  subtotal_bs: number;
  tax_amount_bs: number;
  retention_amount_bs: number;
  invoice_items: any[];
}

interface Payment {
  id: string;
  type: string;
  payment_date: string;
  amount_paid: number;
  reference?: string;
  payment_method: string;
  currency: string;
  exchange_rate: number;
  evidence_url?: string;
  customer: {
    name: string;
    doc_number: string;
  };
}

interface InvoicePageClientProps {
  initialInvoices: Invoice[];
  initialPayments: Payment[];
}

// Sub-component for individual row actions
const InvoiceActionButtons = ({ invoice }: { invoice: Invoice }) => {
  const [generating, setGenerating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleGeneratePDF = async (action: 'view' | 'download') => {
    setGenerating(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const doc = <InvoicePDF invoice={invoice} />;
      const asBlob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(asBlob);
      
      if (action === 'view') {
        window.open(url, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = url;
        const fileName = invoice.invoice_number 
          ? `${invoice.type}_${String(invoice.invoice_number).padStart(6, '0')}.pdf`
          : `${invoice.type}_${invoice.id.slice(0, 8)}.pdf`;
        link.download = fileName;
        link.click();
      }
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error al generar el PDF");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Error al eliminar: ${error.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Error al eliminar la factura");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menú</span>
            <MoreVertical className="h-4 w-4 text-slate-500" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <Link href={`/dashboard/facturacion/edit/${invoice.id}`}>
            <DropdownMenuItem className="cursor-pointer">
              <Pencil className="mr-2 h-4 w-4 text-slate-500" />
              <span>Editar</span>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="cursor-pointer text-red-600 focus:text-red-600" 
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash className="mr-2 h-4 w-4" />
            <span>Eliminar</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de que deseas eliminar esta factura?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la factura {invoice.invoice_number ? `#${String(invoice.invoice_number).padStart(6, '0')}` : `#${invoice.id.slice(0, 8)}`} y sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }} 
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Move outside component to avoid re-creation (Vercel Best Practice 4.2)
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

export default function InvoicePageClient({ initialInvoices, initialPayments }: InvoicePageClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPagePayments, setCurrentPagePayments] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const router = useRouter();

  const handleOpenSelection = () => setIsSelectionModalOpen(true);
  
  const navigateToNew = (type: 'FACTURA' | 'RECIBO') => {
    router.push(`/dashboard/facturacion/nueva?type=${type}`);
  };

  const filteredInvoices = useMemo(() => {
    return initialInvoices.filter((invoice) =>
      invoice.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.invoice_number && String(invoice.invoice_number).includes(searchTerm)) ||
      (invoice.control_number && String(invoice.control_number).includes(searchTerm))
    );
  }, [initialInvoices, searchTerm]);

  const filteredPayments = useMemo(() => {
    return initialPayments.filter((p) => {
      const customerName = p.customer?.name?.toLowerCase() || "";
      const reference = (p.reference || "").toLowerCase();
      const search = searchTerm.toLowerCase();

      return customerName.includes(search) || reference.includes(search);
    });
  }, [initialPayments, searchTerm]);

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInvoices.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredInvoices, currentPage]);

  const paginatedPayments = useMemo(() => {
    const start = (currentPagePayments - 1) * ITEMS_PER_PAGE;
    return filteredPayments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPayments, currentPagePayments]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Módulo de Facturación</h1>
          <p className="text-slate-500 italic">Gestión administrativa de facturas, recibos y recaudación.</p>
        </div>
        <Button 
          className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2 transition-all font-bold shadow-md" 
          onClick={handleOpenSelection}
        >
          <Plus className="h-4 w-4" /> Nueva Factura / Recibo
        </Button>
      </div>

      <Tabs defaultValue="invoices" className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="invoices" className="gap-2 text-xs font-bold uppercase tracking-tighter data-[state=active]:bg-white data-[state=active]:text-cyan-700">
              <FileText className="h-3.5 w-3.5" /> Facturas y Recibos
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2 text-xs font-bold uppercase tracking-tighter data-[state=active]:bg-white data-[state=active]:text-cyan-700">
              <History className="h-3.5 w-3.5" /> Historial de Pagos
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); setCurrentPagePayments(1); }}
              className="pl-10 h-9 border-slate-200"
            />
          </div>
        </div>

        <TabsContent value="invoices" className="mt-0 space-y-4">
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="w-[120px] text-[10px] font-bold uppercase">Nro. Factura</TableHead>
                  <TableHead className="w-[120px] text-[10px] font-bold uppercase">Nro. Control</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Cliente</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Tipo</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Fecha Emisión</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Monto USD</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Monto Bs</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-center">Estado</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase pr-4">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-slate-500">
                      No se encontraron documentos fiscales.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-slate-50/50 transition-colors text-xs">
                      <TableCell className="font-mono text-slate-600 font-bold">
                        {invoice.invoice_number ? String(invoice.invoice_number).padStart(6, '0') : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-slate-400">
                        {invoice.control_number ? String(invoice.control_number).padStart(6, '0') : "-"}
                      </TableCell>
                      <TableCell className="font-bold">{invoice.customer.name}</TableCell>
                      <TableCell>
                         <Badge variant="outline" className="text-[9px] font-bold uppercase border-slate-200 bg-white">
                           {invoice.type}
                         </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.issue_date), "dd MMM yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="font-bold">${invoice.total_usd.toFixed(2)}</TableCell>
                      <TableCell className="text-slate-500">Bs {invoice.total_bs.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-center">{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right pr-4">
                        <InvoiceActionButtons invoice={invoice} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {filteredInvoices.length > ITEMS_PER_PAGE && (
              <DataPagination
                currentPage={currentPage}
                totalItems={filteredInvoices.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="payments" className="mt-0">
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400">Fecha Pago</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400">Cliente</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400">Tipo</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400">Referencia</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400">Método</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-right">Monto Recibido</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-right pr-4">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-500 italic">
                      No se han registrado pagos todavía.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPayments.map((p) => (
                    <TableRow key={p.id} className="border-slate-50 text-xs hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-medium">{format(new Date(p.payment_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{p.customer?.name || "Cliente Desconocido"}</span>
                          <span className="text-[9px] text-slate-400 uppercase">{p.customer?.doc_number || "---"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] font-bold uppercase border-slate-200 bg-white">
                          {p.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-slate-600 uppercase flex items-center gap-1">
                        <Hash className="h-3 w-3 text-slate-300" /> {p.reference || "S/R"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] uppercase border-slate-200 bg-white font-bold">
                          {p.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-bold text-cyan-700">
                          {p.currency === "BS" ? "Bs. " : "$"} {p.amount_paid.toLocaleString()}
                        </div>
                        {p.currency === "BS" && <div className="text-[9px] text-slate-400 font-medium">Tasa: {p.exchange_rate}</div>}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        {p.evidence_url && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                            onClick={() => window.open(p.evidence_url, '_blank')}
                            title="Ver Comprobante"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {filteredPayments.length > ITEMS_PER_PAGE && (
              <DataPagination
                currentPage={currentPagePayments}
                totalItems={filteredPayments.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPagePayments}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Selection Modal */}
      <Dialog open={isSelectionModalOpen} onOpenChange={setIsSelectionModalOpen}>
        <DialogContent className="sm:max-w-[500px] border-t-4 border-t-cyan-500">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900">Tipo de Documento</DialogTitle>
            <DialogDescription>
              ¿Qué tipo de comprobante de cobro desea generar hoy?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-6">
            <button
              onClick={() => navigateToNew('FACTURA')}
              className="group flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-cyan-500 hover:bg-cyan-50/50 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-slate-100 group-hover:bg-cyan-100 transition-colors">
                  <FileText className="h-6 w-6 text-slate-600 group-hover:text-cyan-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Factura Fiscal</p>
                  <p className="text-xs text-slate-500">Documento legal con IVA y retenciones.</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-cyan-500 transform group-hover:translate-x-1 transition-all" />
            </button>

            <button
              onClick={() => navigateToNew('RECIBO')}
              className="group flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-slate-100 group-hover:bg-indigo-100 transition-colors">
                  <ReceiptIcon className="h-6 w-6 text-slate-600 group-hover:text-indigo-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Recibo de Cobro</p>
                  <p className="text-xs text-slate-500">Comprobante de pago administrativo.</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
