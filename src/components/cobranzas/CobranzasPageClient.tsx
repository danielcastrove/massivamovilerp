"use client";

import React, { useState, useMemo, useEffect } from "react";
import Search from "lucide-react/dist/esm/icons/search";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
import Clock from "lucide-react/dist/esm/icons/clock";
import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal";
import Eye from "lucide-react/dist/esm/icons/eye";
import FileText from "lucide-react/dist/esm/icons/file-text";
import CreditCard from "lucide-react/dist/esm/icons/credit-card";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import ArrowUpRight from "lucide-react/dist/esm/icons/arrow-up-right";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import Download from "lucide-react/dist/esm/icons/download";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import { format, differenceInDays, isBefore } from "date-fns";
import { es } from "date-fns/locale";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import User from "lucide-react/dist/esm/icons/user";
import NotificationModal from "@/components/ui/notification-modal";

// Dynamic imports for heavy modals
const PaymentModal = dynamic(() => import("./PaymentModal"), { ssr: false });
const ViewInvoiceModal = dynamic(() => import("./ViewInvoiceModal"), { ssr: false });
const StatusEditModal = dynamic(() => import("./StatusEditModal"), { ssr: false });
const ViewPaymentModal = dynamic(() => import("./ViewPaymentModal"), { ssr: false });
const EditPaymentModal = dynamic(() => import("./EditPaymentModal"), { ssr: false });

interface CobranzasPageClientProps {
  initialCustomers: any[];
  bcvRate: number;
}

export default function CobranzasPageClient({ initialCustomers, bcvRate }: CobranzasPageClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  // Estado para Modal de Notificación
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  // Modales
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
  const [isViewPaymentModalOpen, setIsViewPaymentModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [initialInvoiceId, setInitialInvoiceId] = useState<string | undefined>(undefined);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  const fetchPayments = async () => {
    setLoadingPayments(true);
    try {
      const res = await fetch("/api/payments");
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (e) {
      console.error("Error fetching payments", e);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleOpenPaymentModal = (customer: any, invoiceId?: string) => {
    setSelectedCustomer(customer);
    setInitialInvoiceId(invoiceId);
    setIsPaymentModalOpen(true);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("¿Está seguro de que desea eliminar este registro de pago? Esta acción no se puede deshacer.")) {
        return;
    }

    setDeletingPaymentId(paymentId);
    try {
        const res = await fetch(`/api/payments/${paymentId}`, {
            method: "DELETE",
        });

        if (res.ok) {
            setNotification({
              isOpen: true,
              title: "¡Éxito!",
              message: "El registro de pago ha sido eliminado correctamente.",
              type: "success"
            });
            fetchPayments();
            router.refresh();
        } else {
            const error = await res.json();
            setNotification({
              isOpen: true,
              title: "Error",
              message: error.message || "No se pudo eliminar el pago. Intente nuevamente.",
              type: "error"
            });
        }
    } catch (error) {
        setNotification({
          isOpen: true,
          title: "Error Crítico",
          message: "Ocurrió un error inesperado en la conexión con el servidor.",
          type: "error"
        });
    } finally {
        setDeletingPaymentId(null);
    }
  };

  const handleOpenViewModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setIsViewModalOpen(true);
  };

  const handleOpenViewPaymentModal = (payment: any) => {
    setSelectedPayment(payment);
    setIsViewPaymentModalOpen(true);
  };

  const handleOpenEditPaymentModal = (payment: any) => {
    setSelectedPayment(payment);
    setIsEditPaymentModalOpen(true);
  };

  const handleOpenStatusModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setIsStatusModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    router.refresh();
    fetchPayments();
  };

  const statusMap: { [key: string]: { label: string; color: string } } = {
    DRAFT: { label: "Borrador", color: "bg-slate-100 text-slate-600" },
    SENT: { label: "Enviado", color: "bg-blue-100 text-blue-700" },
    PARTIAL: { label: "Parcial", color: "bg-amber-100 text-amber-700" },
    PAID: { label: "Pagado", color: "bg-emerald-100 text-emerald-700" },
    OVERDUE: { label: "Vencido", color: "bg-red-100 text-red-700" },
    CANCELLED: { label: "Anulado", color: "bg-gray-100 text-gray-600" },
  };

  const filteredCustomers = useMemo(() => {
    return initialCustomers.map(cust => {
      // Obtener SOLO la última factura de este cliente (la más reciente por fecha de emisión)
      const sortedInvoices = [...(cust.invoices || [])].sort((a, b) => 
        new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime()
      );
      
      // Tomamos solo la primera (la última emitida)
      const lastInvoice = sortedInvoices[0] ? [sortedInvoices[0]] : [];
      
      return {
        ...cust,
        invoices: lastInvoice
      };
    }).filter((cust) => {
      // Solo mostrar clientes que tengan al menos una factura (la última)
      if (cust.invoices.length === 0) return false;

      const matchesSearch = 
        cust.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cust.doc_number.includes(searchTerm);
      
      return matchesSearch;
    });
  }, [initialCustomers, searchTerm]);

  const stats = useMemo(() => {
    let totalUsd = 0;
    let totalBs = 0;
    let overdueUsd = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    initialCustomers.forEach(cust => {
      totalUsd += (cust.total_usd || 0);
      totalBs += (cust.total_bs || 0);
      
      (cust.invoices || []).forEach((inv: any) => {
        pendingCount++;
        if (inv.status === "OVERDUE") {
          overdueUsd += (inv.total_usd || 0);
          overdueCount++;
        }
      });
    });

    return { totalUsd, totalBs, overdueUsd, pendingCount, overdueCount };
  }, [initialCustomers]);

  const getSemaforoInfo = (date: string | Date) => {
    if (!date) return { color: "bg-slate-300", text: "text-slate-500", bg: "bg-slate-50" };
    const today = new Date();
    const dueDate = new Date(date);
    if (isBefore(dueDate, today)) return { color: "bg-red-500", text: "text-red-600", bg: "bg-red-50" };
    const daysRemaining = differenceInDays(dueDate, today);
    if (daysRemaining <= 5) return { color: "bg-amber-500", text: "text-amber-600", bg: "bg-amber-50" };
    return { color: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50" };
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-slate-900 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Deuda Total Clientes</p>
                <h3 className="text-2xl font-black mt-1">${stats.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                <p className="text-cyan-400 text-[9px] font-mono mt-1">Bs. {stats.totalBs.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="p-2 bg-slate-800 rounded-lg"><TrendingUp className="h-5 w-5 text-cyan-400" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white border border-slate-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Monto en Mora</p>
                <h3 className="text-2xl font-black mt-1 text-red-600">${stats.overdueUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                <p className="text-slate-400 text-[9px] mt-1 uppercase font-bold">{stats.overdueCount} Facturas Vencidas</p>
              </div>
              <div className="p-2 bg-red-50 rounded-lg"><AlertCircle className="h-5 w-5 text-red-500" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white border border-slate-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Doc. Pendientes</p>
                <h3 className="text-2xl font-black mt-1 text-slate-900">{stats.pendingCount}</h3>
                <p className="text-slate-400 text-[9px] mt-1 uppercase font-bold tracking-tighter">Deuda repartida en {initialCustomers.length} Clientes</p>
              </div>
              <div className="p-2 bg-slate-100 rounded-lg"><FileText className="h-5 w-5 text-slate-600" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-cyan-600 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-cyan-100 text-[10px] font-bold uppercase tracking-widest">Tasa BCV Referencia</p>
                <h3 className="text-2xl font-black mt-1">Bs. {Number(bcvRate).toFixed(2)}</h3>
                <p className="text-cyan-200 text-[9px] font-mono mt-1">Actualizado del Portal BCV</p>
              </div>
              <div className="p-2 bg-cyan-500/50 rounded-lg"><ArrowUpRight className="h-5 w-5 text-white" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pendientes" className="w-full" onValueChange={(val) => val === "historial" && fetchPayments()}>
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-4 bg-slate-100">
          <TabsTrigger value="pendientes" className="text-xs font-bold uppercase tracking-tight data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
            <AlertCircle className="h-3.5 w-3.5 mr-2" /> Monitor de Deudores
          </TabsTrigger>
          <TabsTrigger value="historial" className="text-xs font-bold uppercase tracking-tight data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
            <CreditCard className="h-3.5 w-3.5 mr-2" /> Historial de Pagos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendientes">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-cyan-600" /> Última Factura por Cliente
            </h3>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar cliente..." 
                className="pl-10 h-9 border-slate-200 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400">Cliente / Deudor</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-center">Facturas Totales</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400">Vencimiento Última</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-right">Deuda Total</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-center">Estado Última</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-right pr-4">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-500 italic">
                      No hay deudores activos en el sistema.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((cust) => {
                    const lastInv = cust.invoices[0];
                    const semaforo = getSemaforoInfo(lastInv?.proximo_vencimiento_producto || lastInv?.due_date || cust.oldest_due_date);
                    const statusInfo = statusMap[lastInv?.status] || { label: lastInv?.status, color: "bg-slate-100 text-slate-600" };
                    const isExpanded = expandedCustomer === cust.id;
                    
                    return (
                      <React.Fragment key={cust.id}>
                        <TableRow className={`group border-slate-50 hover:bg-slate-50/50 transition-colors ${isExpanded ? 'bg-slate-50/50' : ''}`}>
                          <TableCell><div className={`h-2.5 w-2.5 rounded-full ${semaforo.color}`} /></TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-xs">{cust.name}</span>
                              <span className="text-[9px] text-slate-400 font-mono uppercase">{cust.doc_number}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[10px] font-black h-5 px-2 border-slate-200 bg-white">
                              {cust.invoice_count || 1}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${semaforo.bg} ${semaforo.text} font-bold text-[10px]`}>
                              <Clock className="h-3 w-3" /> {lastInv ? format(new Date(lastInv.proximo_vencimiento_producto || lastInv.due_date), "dd MMM yyyy", { locale: es }) : "---"}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-black text-slate-900 text-xs font-mono">${cust.total_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            <div className="text-[9px] text-slate-400 font-mono text-cyan-700 font-bold">Bs. {cust.total_bs.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`text-[9px] font-bold uppercase px-2 py-0 border-none ${statusInfo.color}`}>
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <div className="flex justify-end items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                                onClick={() => handleOpenPaymentModal(cust)}
                                title="Registrar Pago de Cliente"
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className={`h-8 w-8 transition-colors ${isExpanded ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                                onClick={() => setExpandedCustomer(isExpanded ? null : cust.id)}
                                title="Ver Última Factura"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        {isExpanded && lastInv && (
                          <TableRow className="bg-slate-50/30 border-t-0">
                            <TableCell colSpan={7} className="p-0">
                              <div className="px-12 py-4 border-l-4 border-cyan-500 ml-4 mb-4 space-y-3">
                                <h4 className="text-[10px] font-black uppercase text-cyan-600 tracking-widest flex items-center gap-2">
                                  <FileText className="h-3 w-3" /> Detalle de la Última Factura Pendiente
                                </h4>
                                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                  <Table>
                                    <TableHeader className="bg-slate-50/50">
                                      <TableRow className="hover:bg-transparent border-slate-100">
                                        <TableHead className="text-[9px] font-bold uppercase py-2">Documento</TableHead>
                                        <TableHead className="text-[9px] font-bold uppercase py-2">Emisión</TableHead>
                                        <TableHead className="text-[9px] font-bold uppercase py-2 text-right">Total USD</TableHead>
                                        <TableHead className="text-[9px] font-bold uppercase py-2 text-center">Estado</TableHead>
                                        <TableHead className="text-[9px] font-bold uppercase py-2 text-right pr-4">Acciones</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      <TableRow className="border-slate-50 group/inv hover:bg-slate-50 transition-colors">
                                        <TableCell className="py-2">
                                          <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-slate-700">#{lastInv.invoice_number ? String(lastInv.invoice_number).padStart(6, '0') : lastInv.id.slice(0, 8).toUpperCase()}</span>
                                            <span className="text-[9px] text-slate-400 uppercase font-medium">{lastInv.type}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell className="py-2 text-[10px] text-slate-500">{format(new Date(lastInv.issue_date), "dd/MM/yyyy")}</TableCell>
                                        <TableCell className="py-2 text-right">
                                          <div className="text-[11px] font-black font-mono text-slate-900">${lastInv.total_usd.toFixed(2)}</div>
                                          <div className="text-[9px] text-slate-400 font-mono">Bs. {lastInv.total_bs.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                        </TableCell>
                                        <TableCell className="py-2 text-center">
                                          <Badge className={`text-[8px] font-black uppercase px-1.5 h-4 border-none ${statusMap[lastInv.status]?.color}`}>
                                            {statusMap[lastInv.status]?.label}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="py-2 text-right pr-4">
                                          <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-cyan-600" onClick={() => handleOpenPaymentModal(cust, lastInv.id)}><CreditCard className="h-3.5 w-3.5" /></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600" onClick={() => handleOpenViewModal(lastInv)}><Eye className="h-3.5 w-3.5" /></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" onClick={() => handleOpenStatusModal(lastInv)}><Pencil className="h-3.5 w-3.5" /></Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="historial">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400">Fecha</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400">Cliente</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400">Referencia / Método</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-right">Monto USD</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-right">Monto Bs.</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingPayments ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-cyan-600" /></TableCell></TableRow>
                ) : payments.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-500 italic">No hay registros de pagos realizados.</TableCell></TableRow>
                ) : (
                  payments.map((pay) => (
                    <TableRow key={pay.id} className="hover:bg-slate-50/50 border-slate-50">
                      <TableCell className="text-xs font-medium text-slate-600">{format(new Date(pay.payment_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-xs">{pay.customer?.name || "Cliente Desconocido"}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{pay.customer?.doc_number || "---"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 text-xs">{pay.reference || "S/R"}</span>
                          <Badge variant="secondary" className="w-fit text-[8px] h-4 px-1 bg-slate-100">{pay.payment_method}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-slate-900 text-xs font-mono">${Number(pay.amount_paid).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-black text-cyan-700 text-xs font-mono">Bs. {(Number(pay.amount_paid) * Number(pay.exchange_rate)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          {pay.evidence_url && (
                            <a href={pay.evidence_url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-cyan-50 rounded-md transition-colors" title="Descargar Comprobante">
                                <Download className="h-3.5 w-3.5 text-cyan-600" />
                            </a>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600" title="Ver Detalle de Pago" onClick={() => handleOpenViewPaymentModal(pay)}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" title="Editar Pago" onClick={() => handleOpenEditPaymentModal(pay)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-red-500" 
                            title="Eliminar Pago" 
                            disabled={deletingPaymentId === pay.id}
                            onClick={() => handleDeletePayment(pay.id)}
                          >
                            {deletingPaymentId === pay.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modales */}
      {selectedCustomer && (
        <PaymentModal 
          isOpen={isPaymentModalOpen} 
          onClose={() => { setIsPaymentModalOpen(false); setSelectedCustomer(null); setInitialInvoiceId(undefined); }} 
          customer={selectedCustomer} 
          initialInvoiceId={initialInvoiceId}
          bcvRate={bcvRate}
          onSuccess={handlePaymentSuccess}
        />
      )}
      
      {selectedInvoice && (
        <>
          <ViewInvoiceModal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} invoice={selectedInvoice} />
          <StatusEditModal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} invoice={selectedInvoice} onSuccess={handlePaymentSuccess} />
        </>
      )}

      <ViewPaymentModal 
        isOpen={isViewPaymentModalOpen} 
        onClose={() => { setIsViewPaymentModalOpen(false); setSelectedPayment(null); }} 
        payment={selectedPayment}
      />

      <EditPaymentModal 
        isOpen={isEditPaymentModalOpen} 
        onClose={() => { setIsEditPaymentModalOpen(false); setSelectedPayment(null); }} 
        payment={selectedPayment}
        onSuccess={handlePaymentSuccess}
      />

      <NotificationModal 
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
}
