"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertCircle,
  TrendingUp,
  DollarSign,
  Coins,
  Building2,
  UserPlus,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export interface DashboardListPayment {
  id: string;
  customerName: string;
  amount: number;
  currency: string;
  method: string;
  date: string;
}

export interface DashboardListInvoice {
  id: string;
  number: string;
  customerName: string;
  status: string;
  type: string;
  totalUsd: number;
  due: string;
}

export interface DashboardData {
  kpis: {
    pendingUsd: number;
    pendingBs: number;
    overdueUsd: number;
    overdueCount: number;
    collectedMonthUsd: number;
    collectedMonthBs: number;
    activeClients: number;
    totalClients: number;
    renewalsSoon: number;
  };
  tasa: number;
  charts: {
    monthly: { month: string; facturadoUsd: number; cobradoUsd: number }[];
    methods: { method: string; count: number }[];
    leads: { status: string; count: number }[];
  };
  lists: {
    recentPayments: DashboardListPayment[];
    upcomingDue: DashboardListInvoice[];
    overdueTop: DashboardListInvoice[];
    customersByRubro: { rubro: string; count: number }[];
    recentLeads: { name: string; company: string; status: string; date: string; vip: boolean }[];
  };
  allowedModulePaths: string[];
}

const statusMap: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Borrador", color: "bg-slate-100 text-slate-600" },
  SENT: { label: "Enviado", color: "bg-blue-100 text-blue-700" },
  PARTIAL: { label: "Parcial", color: "bg-amber-100 text-amber-700" },
  PAID: { label: "Pagado", color: "bg-emerald-100 text-emerald-700" },
  OVERDUE: { label: "Vencido", color: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Anulado", color: "bg-gray-100 text-gray-600" },
};

const leadStatusLabel: Record<string, string> = {
  SIN_CONTACTAR: "Sin contactar",
  PROPUESTA_ENVIADA: "Propuesta enviada",
  LLAMADA_REALIZADA: "Llamada realizada",
  CONTACTO_REALIZADO: "Contacto realizado",
  CLIENTE_CERRADO: "Cliente cerrado",
  ESPERANDO_APROBACION: "Esperando aprobación",
};

const PIE_COLORS = ["#0891b2", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#94a3b8", "#0ea5e9"];

const MODULE_FACTURACION = "/dashboard/facturacion";
const MODULE_COBRANZAS = "/dashboard/cobranzas";
const MODULE_CLIENTES = "/dashboard/customer";
const MODULE_LEADS = "/dashboard/leads";

const fmtMoney = (n: number, digits = 2) =>
  n.toLocaleString("es-VE", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const fmtDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString("es") : "";

interface Props {
  data: DashboardData;
  rangeLabel: string;
}

export default function DashboardPageClient({ data, rangeLabel }: Props) {
  const { kpis, tasa, charts, lists, allowedModulePaths } = data;
  const has = (path: string) => allowedModulePaths.includes(path);
  const canFacturacion = has(MODULE_FACTURACION);
  const canCobranzas = has(MODULE_COBRANZAS);
  const canClientes = has(MODULE_CLIENTES);
  const canLeads = has(MODULE_LEADS);
  const showFacturacionVsCobros = canFacturacion || canCobranzas;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-slate-900 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Deuda Total Pendiente</p>
                <h3 className="text-2xl font-black mt-1">${fmtMoney(kpis.pendingUsd)}</h3>
                <p className="text-cyan-400 text-[9px] font-mono mt-1">Bs. {fmtMoney(kpis.pendingBs)}</p>
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
                <h3 className="text-2xl font-black mt-1 text-red-600">${fmtMoney(kpis.overdueUsd)}</h3>
                <p className="text-slate-400 text-[9px] mt-1 uppercase font-bold">{kpis.overdueCount} Facturas Vencidas</p>
              </div>
              <div className="p-2 bg-red-50 rounded-lg"><AlertCircle className="h-5 w-5 text-red-500" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white border border-slate-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Cobrado en el Mes</p>
                <h3 className="text-2xl font-black mt-1 text-emerald-600">${fmtMoney(kpis.collectedMonthUsd)}</h3>
                <p className="text-slate-400 text-[9px] font-mono mt-1">Bs. {fmtMoney(kpis.collectedMonthBs)}</p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg"><DollarSign className="h-5 w-5 text-emerald-500" /></div>
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
                  <RefreshCw className="h-3 w-3" /> {kpis.renewalsSoon} Renovaciones próximas
                </p>
              </div>
              <div className="p-2 bg-cyan-50 rounded-lg"><Coins className="h-5 w-5 text-cyan-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {showFacturacionVsCobros && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-tight">
              {canFacturacion && canCobranzas
                ? `Facturación vs Cobros (${rangeLabel})`
                : canFacturacion
                  ? `Facturación (${rangeLabel})`
                  : `Cobros (${rangeLabel})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} minTickGap={16} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => `$${fmtMoney(Number(value))}`} />
                  {canFacturacion && canCobranzas && <Legend wrapperStyle={{ fontSize: 11 }} />}
                  {canFacturacion && <Bar dataKey="facturadoUsd" name="Facturado" fill="#0891b2" />}
                  {canCobranzas && <Bar dataKey="cobradoUsd" name="Cobrado" fill="#10b981" />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        )}

        {canCobranzas && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-tight">
              Métodos de Pago ({rangeLabel})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={charts.methods} dataKey="count" nameKey="method" cx="50%" cy="50%" outerRadius={85}>
                    {charts.methods.map((entry: { method: string }, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        )}

        {canLeads && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-tight">
              Pipeline de Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.leads}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Leads">
                    {charts.leads.map((entry: { status: string }, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        )}
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {canCobranzas && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-tight">
              Cobros Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lists.recentPayments.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Sin cobros registrados.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100">
                    <TableHead className="text-[10px] font-bold uppercase text-slate-400">Cliente</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-slate-400">Método</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-slate-400">Fecha</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lists.recentPayments.map((pm) => (
                    <TableRow key={pm.id} className="border-slate-100">
                      <TableCell className="font-medium text-xs">{pm.customerName}</TableCell>
                      <TableCell className="text-xs text-slate-500">{pm.method}</TableCell>
                      <TableCell className="text-xs text-slate-500">{fmtDate(pm.date)}</TableCell>
                      <TableCell className="text-xs font-bold text-right text-emerald-600">
                        {pm.currency === "BS" ? "Bs. " : ""}${fmtMoney(pm.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        )}

        {canFacturacion && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" /> Próximos Vencimientos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lists.upcomingDue.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Sin renovaciones próximas.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100">
                    <TableHead className="text-[10px] font-bold uppercase text-slate-400">Documento</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-slate-400">Cliente</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-slate-400">Vence</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-right">USD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lists.upcomingDue.map((inv) => (
                    <TableRow key={inv.id} className="border-slate-100">
                      <TableCell className="font-mono text-xs font-bold text-cyan-600">{inv.number}</TableCell>
                      <TableCell className="text-xs">{inv.customerName}</TableCell>
                      <TableCell className="text-xs text-amber-600">{fmtDate(inv.due)}</TableCell>
                      <TableCell className="text-xs font-bold text-right">${fmtMoney(inv.totalUsd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        )}

        {canCobranzas && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" /> Mayor Deuda en Mora
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lists.overdueTop.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Sin facturas vencidas.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100">
                    <TableHead className="text-[10px] font-bold uppercase text-slate-400">Documento</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-slate-400">Cliente</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-slate-400">Estado</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-right">USD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lists.overdueTop.map((inv) => (
                    <TableRow key={inv.id} className="border-slate-100">
                      <TableCell className="font-mono text-xs font-bold text-cyan-600">{inv.number}</TableCell>
                      <TableCell className="text-xs">{inv.customerName}</TableCell>
                      <TableCell>
                        <Badge className={`text-[8px] font-black uppercase px-1.5 h-4 border-none ${statusMap[inv.status]?.color}`}>
                          {statusMap[inv.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-right text-red-600">${fmtMoney(inv.totalUsd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        )}

        {canClientes && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-500" /> Clientes por Rubro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs mb-3">
              {kpis.activeClients} activos de {kpis.totalClients} clientes
            </p>
            {lists.customersByRubro.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Sin datos.</p>
            ) : (
              <div className="space-y-2">
                {lists.customersByRubro.map((r) => (
                  <div key={r.rubro} className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">{r.rubro}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 rounded-full"
                          style={{ width: `${Math.min(100, (r.count / (lists.customersByRubro[0]?.count || 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700">{r.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {canLeads && (
        <Card className="border-slate-200 shadow-sm col-span-1 md:col-span-2 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-cyan-600" /> Últimos Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lists.recentLeads.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Sin leads registrados.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100">
                    <TableHead className="text-[10px] font-bold uppercase text-slate-400">Contacto</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-slate-400">Empresa</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-slate-400">Estado</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-slate-400">Creado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lists.recentLeads.map((lead) => (
                    <TableRow key={lead.name + lead.date} className="border-slate-100">
                      <TableCell className="text-xs font-medium">
                        {lead.name}
                        {lead.vip && (
                          <Badge className="ml-2 text-[8px] font-black uppercase px-1.5 h-4 border-none bg-violet-100 text-violet-700">
                            VIP
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{lead.company || "—"}</TableCell>
                      <TableCell>
                        <Badge className="text-[8px] font-black uppercase px-1.5 h-4 border-none bg-slate-100 text-slate-600">
                          {leadStatusLabel[lead.status] || lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{fmtDate(lead.date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}