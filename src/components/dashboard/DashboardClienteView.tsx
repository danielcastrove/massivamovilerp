"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataPagination } from "@/components/ui/data-pagination";
import { AlertCircle, TrendingUp, CalendarDays, FileText, Coins } from "lucide-react";

export interface ClienteDashboardData {
  name: string;
  doc_number: string;
  pendingUsd: number;
  pendingBs: number;
  overdueUsd: number;
  overdueCount: number;
  nextRenewal: string | null;
  invoices: {
    id: string;
    number: string;
    status: string;
    type: string;
    due_date: string;
    proximo_vencimiento_producto: string | null;
    total_usd: number;
  }[];
  payments: {
    id: string;
    amount: number;
    currency: string;
    method: string;
    reference: string | null;
    date: string;
  }[];
}

const statusMap: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Borrador", color: "bg-slate-100 text-slate-600" },
  SENT: { label: "Enviado", color: "bg-blue-100 text-blue-700" },
  PARTIAL: { label: "Parcial", color: "bg-amber-100 text-amber-700" },
  PAID: { label: "Pagado", color: "bg-emerald-100 text-emerald-700" },
  OVERDUE: { label: "Vencido", color: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Anulado", color: "bg-gray-100 text-gray-600" },
};

const typeLabel: Record<string, string> = {
  FACTURA: "Factura",
  RECIBO: "Recibo",
};

const fmtMoney = (n: number, digits = 2) =>
  n.toLocaleString("es-VE", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const fmtDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString("es") : "");

interface Props {
  data: ClienteDashboardData | null;
  tasa: number;
}

const ITEMS_PER_PAGE = 20;

export default function DashboardClienteView({ data, tasa }: Props) {
  const [currentPageInvoices, setCurrentPageInvoices] = useState(1);
  const [currentPagePayments, setCurrentPagePayments] = useState(1);

  const paginatedInvoices = useMemo(() => {
    const start = (currentPageInvoices - 1) * ITEMS_PER_PAGE;
    return data?.invoices.slice(start, start + ITEMS_PER_PAGE) ?? [];
  }, [data?.invoices, currentPageInvoices]);

  const paginatedPayments = useMemo(() => {
    const start = (currentPagePayments - 1) * ITEMS_PER_PAGE;
    return data?.payments.slice(start, start + ITEMS_PER_PAGE) ?? [];
  }, [data?.payments, currentPagePayments]);

  if (!data) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-8 text-center text-slate-500">
          No hay una cuenta de cliente asociada a tu usuario. Contacta al administrador.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-slate-900 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Mi Deuda Pendiente</p>
                <h3 className="text-2xl font-black mt-1">${fmtMoney(data.pendingUsd)}</h3>
                <p className="text-cyan-400 text-[9px] font-mono mt-1">Bs. {fmtMoney(data.pendingBs)}</p>
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
                <h3 className="text-2xl font-black mt-1 text-red-600">${fmtMoney(data.overdueUsd)}</h3>
                <p className="text-slate-400 text-[9px] mt-1 uppercase font-bold">{data.overdueCount} Facturas Vencidas</p>
              </div>
              <div className="p-2 bg-red-50 rounded-lg"><AlertCircle className="h-5 w-5 text-red-500" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white border border-slate-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Documentos Pendientes</p>
                <h3 className="text-2xl font-black mt-1 text-slate-900">{data.invoices.length}</h3>
                <p className="text-slate-400 text-[9px] mt-1 uppercase font-bold">{data.name}</p>
              </div>
              <div className="p-2 bg-slate-100 rounded-lg"><FileText className="h-5 w-5 text-slate-600" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white border border-slate-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Tasa BCV</p>
                <h3 className="text-2xl font-black mt-1 text-slate-900">{fmtMoney(tasa, 4)}</h3>
                <p className="text-slate-400 text-[9px] mt-1 uppercase font-bold flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {data.nextRenewal ? `Renovación: ${fmtDate(data.nextRenewal)}` : "Sin renovaciones próximas"}
                </p>
              </div>
              <div className="p-2 bg-cyan-50 rounded-lg"><Coins className="h-5 w-5 text-cyan-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <div className="p-6 pb-0 text-sm font-bold text-slate-700 uppercase tracking-tight">Mis Facturas Pendientes</div>
          <div className="p-6">
            {data.invoices.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No tienes facturas pendientes.</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100">
                      <TableHead className="text-[10px] font-bold uppercase text-slate-400">Documento</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-slate-400">Tipo</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-slate-400">Estado</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-slate-400">Vencimiento</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-right">USD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInvoices.map((inv) => (
                      <TableRow key={inv.id} className="border-slate-100">
                        <TableCell className="font-mono text-xs font-bold text-cyan-600">{inv.number}</TableCell>
                        <TableCell className="text-xs">{typeLabel[inv.type] || inv.type}</TableCell>
                        <TableCell>
                          <Badge className={`text-[8px] font-black uppercase px-1.5 h-4 border-none ${statusMap[inv.status]?.color}`}>
                            {statusMap[inv.status]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-amber-600">
                          {inv.proximo_vencimiento_producto ? fmtDate(inv.proximo_vencimiento_producto) : fmtDate(inv.due_date)}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-right">${fmtMoney(inv.total_usd)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {data.invoices.length > ITEMS_PER_PAGE && (
                  <DataPagination
                    currentPage={currentPageInvoices}
                    totalItems={data.invoices.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPageInvoices}
                  />
                )}
              </>
            )}
          </div>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <div className="p-6 pb-0 text-sm font-bold text-slate-700 uppercase tracking-tight">Mis Pagos Recientes</div>
          <div className="p-6">
            {data.payments.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Sin pagos registrados.</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100">
                      <TableHead className="text-[10px] font-bold uppercase text-slate-400">Fecha</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-slate-400">Método</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-slate-400">Referencia</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPayments.map((pm) => (
                      <TableRow key={pm.id} className="border-slate-100">
                        <TableCell className="text-xs text-slate-500">{fmtDate(pm.date)}</TableCell>
                        <TableCell className="text-xs">{pm.method}</TableCell>
                        <TableCell className="text-xs text-slate-500">{pm.reference || "—"}</TableCell>
                        <TableCell className="text-xs font-bold text-right text-emerald-600">
                          {pm.currency === "BS" ? "Bs. " : ""}${fmtMoney(pm.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {data.payments.length > ITEMS_PER_PAGE && (
                  <DataPagination
                    currentPage={currentPagePayments}
                    totalItems={data.payments.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPagePayments}
                  />
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}