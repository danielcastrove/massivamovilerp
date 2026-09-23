"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Search, AlertCircle, Clock, MoreHorizontal, Eye, FileText, CreditCard, TrendingUp, ArrowUpRight, Pencil, Download, Trash2, Loader2, User, RefreshCw, CalendarDays, X, Package, MessageSquare, Phone, Mail } from "lucide-react";
import { format, isBefore, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import NotificationModal from "@/components/ui/notification-modal";
import { DataPagination } from "@/components/ui/data-pagination";
import { ContactModal, ContactEntity } from "@/components/customers/ContactModal";

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
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [frecuenciaFilter, setFrecuenciaFilter] = useState("ALL");
  const endDateInputRef = useRef<HTMLInputElement>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [renewingPaymentId, setRenewingPaymentId] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 20;
  const [currentPageDebtors, setCurrentPageDebtors] = useState(1);
  const [currentPagePayments, setCurrentPagePayments] = useState(1);

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
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactChannel, setContactChannel] = useState<"SMS" | "WHATSAPP" | "EMAIL">("SMS");
  const [contactEntity, setContactEntity] = useState<ContactEntity | undefined>(undefined);

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

  const handleContactCustomer = (customer: any, channel: "SMS" | "WHATSAPP" | "EMAIL") => {
    setContactEntity({
      id: customer.id,
      name: customer.name,
      doc_number: customer.doc_number,
      email: customer.email,
      telefono_empresa: customer.telefono_empresa,
      telefono_celular: customer.telefono_celular,
      persona_contacto_info: customer.persona_contacto_info,
    });
    setContactChannel(channel);
    setContactModalOpen(true);
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

  const handleRenewInvoice = async (paymentId: string, invoiceId: string) => {
    if (!confirm("¿Está seguro de que desea renovar esta factura? Se creará una nueva factura con las mismas condiciones pero con fechas actualizadas.")) {
      return;
    }

    setRenewingPaymentId(paymentId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/renew`, {
        method: "POST",
      });

      if (res.ok) {
        setNotification({
          isOpen: true,
          title: "¡Renovación Exitosa!",
          message: "La factura ha sido renovada correctamente. Se ha creado una nueva factura y un nuevo registro de pago.",
          type: "success",
        });
        fetchPayments();
        router.refresh();
      } else {
        const error = await res.json();
        setNotification({
          isOpen: true,
          title: "Error al Renovar",
          message: error.message || "No se pudo renovar la factura. Intente nuevamente.",
          type: "error",
        });
      }
    } catch (error) {
      setNotification({
        isOpen: true,
        title: "Error Crítico",
        message: "Ocurrió un error inesperado en la conexión con el servidor.",
        type: "error",
      });
    } finally {
      setRenewingPaymentId(null);
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

  const getDueDate = (inv: any) => inv?.proximo_vencimiento_producto || inv?.due_date || null;

  const parseDateInput = (value: string): Date | null => {
    if (!value) return null;
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilterStartDate(value);
    setCurrentPageDebtors(1);
    if (value) {
      endDateInputRef.current?.focus();
      (endDateInputRef.current as any)?.showPicker?.();
    }
  };

  const handleClearDates = () => {
    setFilterStartDate("");
    setFilterEndDate("");
  };

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    initialCustomers.forEach(cust => {
      (cust.invoices || []).forEach((inv: any) => {
        (inv.invoice_items || []).forEach((item: any) => {
          const cat = item.product?.category;
          if (cat?.id && !map.has(cat.id)) map.set(cat.id, cat.name);
        });
      });
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [initialCustomers]);

  const filteredCustomers = useMemo(() => {
    const today = new Date();
    const cutoff = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000);
    const startDate = filterStartDate ? startOfDay(parseDateInput(filterStartDate)!) : null;
    const endDate = filterEndDate ? endOfDay(parseDateInput(filterEndDate)!) : null;

    return initialCustomers.map(cust => {
      // Todas las facturas del cliente dentro del rango de fechas (o la ventana
      // por defecto de 10 días), ordenadas de la más vieja a la más nueva
      const invoices = [...(cust.invoices || [])]
        .filter(inv => {
          const due = new Date(getDueDate(inv)).getTime();
          if (Number.isNaN(due)) return false;
          if (startDate && due < startDate.getTime()) return false;
          if (endDate && due > endDate.getTime()) return false;
          if (!startDate && !endDate && due > cutoff.getTime()) return false;
          if (docTypeFilter !== "ALL" && inv.type !== docTypeFilter) return false;
          if (categoryFilter !== "ALL") {
            const hasCategory = (inv.invoice_items || []).some(
              (item: any) => item.product?.category?.id === categoryFilter
            );
            if (!hasCategory) return false;
          }
          if (statusFilter === "SENT" && inv.status !== "SENT") return false;
          if (statusFilter === "OVERDUE" && inv.status !== "OVERDUE") return false;
          if (frecuenciaFilter !== "ALL") {
            const days = parseInt(frecuenciaFilter, 10);
            const rangeStart = new Date(today);
            rangeStart.setDate(today.getDate() - days);
            const dueTime = new Date(getDueDate(inv)).getTime();
            const todayEnd = endOfDay(today).getTime();
            const rangeStartTime = startOfDay(rangeStart).getTime();
            if (Number.isNaN(dueTime) || dueTime < rangeStartTime || dueTime > todayEnd) return false;
          }
          return true;
        })
        .sort((a, b) => new Date(getDueDate(a)).getTime() - new Date(getDueDate(b)).getTime());

      return {
        ...cust,
        invoices,
      };
    }).filter((cust) => {
      // Solo mostrar clientes que tengan al menos una factura en el rango
      if (cust.invoices.length === 0) return false;

      const matchesSearch = 
        cust.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cust.doc_number.includes(searchTerm);

      return matchesSearch;
    });
  }, [initialCustomers, searchTerm, filterStartDate, filterEndDate, docTypeFilter, categoryFilter, statusFilter, frecuenciaFilter]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPageDebtors - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPageDebtors]);

  const paginatedPayments = useMemo(() => {
    const start = (currentPagePayments - 1) * ITEMS_PER_PAGE;
    return payments.slice(start, start + ITEMS_PER_PAGE);
  }, [payments, currentPagePayments]);

  const handleExportExcel = () => {
    const rows = filteredCustomers.flatMap(cust =>
      (cust.invoices || []).map((inv: any) => {
        const statusInfo = statusMap[inv.status] || { label: inv.status, color: "" };
        const invNumber = inv.invoice_number
          ? String(inv.invoice_number).padStart(6, "0")
          : inv.id
            ? inv.id.slice(0, 8).toUpperCase()
            : "";
        return {
          "Cliente": cust.name,
          "RIF/CIF": cust.doc_number,
          "Documento": invNumber,
          "Tipo": inv.type,
          "Emisión": inv.issue_date ? format(new Date(inv.issue_date), "dd/MM/yyyy") : "",
          "Vencimiento": getDueDate(inv) ? format(new Date(getDueDate(inv)), "dd/MM/yyyy") : "",
          "Total USD": Number(inv.total_usd || 0).toFixed(2),
          "Total Bs": Number(inv.total_bs || 0).toFixed(2),
          "Estado": statusInfo.label || inv.status,
        };
      })
    );

    if (rows.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cobranzas");
    XLSX.writeFile(workbook, `Cobranzas_Filtrado_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
  };

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
    return { color: "bg-amber-500", text: "text-amber-600", bg: "bg-amber-50" };
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
          <div className="flex flex-col justify-between gap-4 mb-4">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-cyan-600" /> Última Factura por Cliente
            </h3>

            <div className="flex flex-col lg:flex-row items-end lg:items-center gap-3 w-full lg:w-auto">
              {/* <div className="relative w-full lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 mt-2" />
                <Input 
                  placeholder="Buscar cliente..." 
                  className="pl-10 h-9 border-slate-200 text-xs mt-4"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div> */}

              <div className="flex items-end gap-3 flex-wrap">
                <div className="relative w-full lg:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 mt-2" />
                  <Input 
                    placeholder="Buscar cliente..." 
                    className="pl-10 h-9 border-slate-200 text-xs mt-4"
                    value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPageDebtors(1); }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wide flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Estado
                  </span>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPageDebtors(1); }}>
                    <SelectTrigger className="h-9 w-[160px] border-slate-200 text-xs text-slate-600">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos</SelectItem>
                      <SelectItem value="SENT">Enviado</SelectItem>
                      <SelectItem value="OVERDUE">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wide flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> Frecuencia
                  </span>
                  <Select value={frecuenciaFilter} onValueChange={(v) => { setFrecuenciaFilter(v); setCurrentPageDebtors(1); }}>
                    <SelectTrigger className="h-9 w-[160px] border-slate-200 text-xs text-slate-600">
                      <SelectValue placeholder="Frecuencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todas</SelectItem>
                      <SelectItem value="10">Últimos 10 días</SelectItem>
                      <SelectItem value="15">Últimos 15 días</SelectItem>
                      <SelectItem value="30">Últimos 30 días</SelectItem>
                      <SelectItem value="45">Últimos 45 días</SelectItem>
                      <SelectItem value="60">Últimos 60 días</SelectItem>
                      <SelectItem value="90">Últimos 90 días</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wide flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> Fecha Inicio
                  </span>
                  <Input 
                    type="date" 
                    className="h-9 w-[150px] border-slate-200 text-xs text-slate-600"
                    value={filterStartDate}
                    onChange={handleStartDateChange}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wide flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> Fecha Fin
                  </span>
                  <Input 
                    ref={endDateInputRef}
                    type="date" 
                    className="h-9 w-[150px] border-slate-200 text-xs text-slate-600"
                    value={filterEndDate}
                    onChange={(e) => { setFilterEndDate(e.target.value); setCurrentPageDebtors(1); }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wide flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Tipo Documento
                  </span>
                  <Select value={docTypeFilter} onValueChange={(v) => { setDocTypeFilter(v); setCurrentPageDebtors(1); }}>
                    <SelectTrigger className="h-9 w-[140px] border-slate-200 text-xs text-slate-600">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos</SelectItem>
                      <SelectItem value="FACTURA">Factura</SelectItem>
                      <SelectItem value="RECIBO">Recibo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wide flex items-center gap-1">
                    <Package className="h-3 w-3" /> Tipo Producto
                  </span>
                  <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPageDebtors(1); }}>
                    <SelectTrigger className="h-9 w-[170px] border-slate-200 text-xs text-slate-600">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todas las categorías</SelectItem>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-[11px] text-slate-600 border-slate-200 hover:bg-slate-50"
                  onClick={handleExportExcel}
                  disabled={filteredCustomers.every(c => c.invoices.length === 0)}
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> Exportar Excel
                </Button>
                {(filterStartDate || filterEndDate) && (
                  <Button variant="ghost" size="sm" className="h-9 text-[10px] text-slate-500 hover:text-red-600" onClick={handleClearDates}>
                    <X className="h-3.5 w-3.5 mr-1" /> Limpiar
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400">Cliente / Deudor</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-center">Facturas Totales</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-center">Tipo</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400">Vencimiento Última</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-right">Deuda Total</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-center">Estado Última</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-right pr-4">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-slate-500 italic">
                      No hay deudores activos en el sistema.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCustomers.map((cust) => {
                    const lastInv = cust.invoices[0];
                    const semaforo = getSemaforoInfo(getDueDate(lastInv) || cust.oldest_due_date);
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
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[9px] font-bold uppercase border-slate-200 bg-white">
                              {lastInv?.type || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${semaforo.bg} ${semaforo.text} font-bold text-[10px]`}>
                              <Clock className="h-3 w-3" /> {lastInv ? format(new Date(getDueDate(lastInv)), "dd MMM yyyy", { locale: es }) : "---"}
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
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Contactar Cliente">
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleContactCustomer(cust, "SMS")} className="cursor-pointer">
                                    <MessageSquare className="mr-2 h-4 w-4 text-blue-600" /> Enviar SMS
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleContactCustomer(cust, "WHATSAPP")} className="cursor-pointer">
                                    <Phone className="mr-2 h-4 w-4 text-emerald-600" /> Enviar WhatsApp
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleContactCustomer(cust, "EMAIL")} className="cursor-pointer">
                                    <Mail className="mr-2 h-4 w-4 text-violet-600" /> Enviar Email
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
                        
                        {isExpanded && cust.invoices.length > 0 && (
                          <TableRow className="bg-slate-50/30 border-t-0">
                            <TableCell colSpan={8} className="p-0">
                              <div className="px-12 py-4 border-l-4 border-cyan-500 ml-4 mb-4 space-y-3">
                                <h4 className="text-[10px] font-black uppercase text-cyan-600 tracking-widest flex items-center gap-2">
                                  <FileText className="h-3 w-3" /> Detalle de Facturas Pendientes
                                </h4>
                                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                  <Table>
                                    <TableHeader className="bg-slate-50/50">
                                      <TableRow className="hover:bg-transparent border-slate-100">
                                        <TableHead className="text-[9px] font-bold uppercase py-2"></TableHead>
                                        <TableHead className="text-[9px] font-bold uppercase py-2">Documento</TableHead>
                                        <TableHead className="text-[9px] font-bold uppercase py-2">Emisión</TableHead>
                                        <TableHead className="text-[9px] font-bold uppercase py-2">Vencimiento</TableHead>
                                        <TableHead className="text-[9px] font-bold uppercase py-2 text-right">Total USD</TableHead>
                                        <TableHead className="text-[9px] font-bold uppercase py-2 text-center">Estado</TableHead>
                                        <TableHead className="text-[9px] font-bold uppercase py-2 text-right pr-4">Acciones</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {cust.invoices.map((inv: any, idx: number) => {
                                        const invSemaforo = getSemaforoInfo(getDueDate(inv));
                                        const isOldest = idx === 0;
                                        return (
                                          <TableRow key={inv.id} className="border-slate-50 group/inv hover:bg-slate-50 transition-colors">
                                            <TableCell className="py-2"><div className={`h-2 w-2 rounded-full ${invSemaforo.color}`} /></TableCell>
                                            <TableCell className="py-2">
                                              <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-slate-700">#{inv.invoice_number ? String(inv.invoice_number).padStart(6, '0') : inv.id.slice(0, 8).toUpperCase()}</span>
                                                <span className="text-[9px] text-slate-400 uppercase font-medium">{inv.type}</span>
                                              </div>
                                            </TableCell>
                                            <TableCell className="py-2 text-[10px] text-slate-500">{format(new Date(inv.issue_date), "dd/MM/yyyy")}</TableCell>
                                            <TableCell className="py-2">
                                              <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${invSemaforo.bg} ${invSemaforo.text} font-bold text-[10px]`}>
                                                <Clock className="h-3 w-3" /> {format(new Date(getDueDate(inv)), "dd MMM yyyy", { locale: es })}
                                              </div>
                                            </TableCell>
                                            <TableCell className="py-2 text-right">
                                              <div className="text-[11px] font-black font-mono text-slate-900">${inv.total_usd.toFixed(2)}</div>
                                              <div className="text-[9px] text-slate-400 font-mono">Bs. {inv.total_bs.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                            </TableCell>
                                            <TableCell className="py-2 text-center">
                                              <Badge className={`text-[8px] font-black uppercase px-1.5 h-4 border-none ${statusMap[inv.status]?.color}`}>
                                                {statusMap[inv.status]?.label}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="py-2 text-right pr-4">
                                              <div className="flex justify-end gap-1">
                                                {isOldest && (
                                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-cyan-600" onClick={() => handleOpenPaymentModal(cust, inv.id)} title="Registrar Pago (Solo factura más vieja)"><CreditCard className="h-3.5 w-3.5" /></Button>
                                                )}
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600" onClick={() => handleOpenViewModal(inv)}><Eye className="h-3.5 w-3.5" /></Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" onClick={() => handleOpenStatusModal(inv)}><Pencil className="h-3.5 w-3.5" /></Button>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
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
            {filteredCustomers.length > ITEMS_PER_PAGE && (
              <DataPagination
                currentPage={currentPageDebtors}
                totalItems={filteredCustomers.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPageDebtors}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="historial">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400">Fecha</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400">Cliente</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400">Tipo</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400">Referencia / Método</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-right">Monto USD</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-right">Monto Bs.</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingPayments ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-cyan-600" /></TableCell></TableRow>
                ) : payments.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-slate-500 italic">No hay registros de pagos realizados.</TableCell></TableRow>
                ) : (
                  paginatedPayments.map((pay) => (
                    <TableRow key={pay.id} className="hover:bg-slate-50/50 border-slate-50">
                      <TableCell className="text-xs font-medium text-slate-600">{format(new Date(pay.payment_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-xs">{pay.customer?.name || "Cliente Desconocido"}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{pay.customer?.doc_number || "---"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] font-bold uppercase border-slate-200 bg-white">
                          {pay.type}
                        </Badge>
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
                          {pay.renewableInvoiceId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Renovar Factura"
                              disabled={renewingPaymentId === pay.id}
                              onClick={() => handleRenewInvoice(pay.id, pay.renewableInvoiceId)}
                            >
                              {renewingPaymentId === pay.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            </Button>
                          )}
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
            {payments.length > ITEMS_PER_PAGE && (
              <DataPagination
                currentPage={currentPagePayments}
                totalItems={payments.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPagePayments}
              />
            )}
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

      {contactEntity && (
        <ContactModal
          isOpen={contactModalOpen}
          onClose={() => {
            setContactModalOpen(false);
            setContactEntity(undefined);
          }}
          entity={contactEntity}
          channel={contactChannel}
        />
      )}
    </div>
  );
}
