import { Metadata } from "next";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardPageClient from "@/components/dashboard/DashboardPageClient";
import type { DashboardData } from "@/components/dashboard/DashboardPageClient";
import DashboardRangeSelector from "@/components/dashboard/DashboardRangeSelector";
import { getAllowedModulePaths } from "@/lib/navigation";
import DashboardClienteView from "@/components/dashboard/DashboardClienteView";
import type { ClienteDashboardData } from "@/components/dashboard/DashboardClienteView";

export const metadata: Metadata = {
  title: "Dashboard | MassivaMovil ERP",
  description: "Panel principal con indicadores de facturación, cobranza, clientes y leads.",
};

const PENDING_STATUSES = ["SENT", "PARTIAL", "OVERDUE"] as const;
const DUE_WINDOW_DAYS = 7;

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function labelRubro(rubr: string | null) {
  if (!rubr) return "Sin rubro";
  return rubr.split("_").join(" ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function monthLabel(d: Date, showYear: boolean) {
  const month = d.toLocaleString("es", { month: "short" });
  return showYear ? `${month} '${String(d.getFullYear()).slice(2)}` : month;
}

function buildMonthly(months: number | null, minDate?: Date) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const start = new Date(now.getFullYear(), now.getMonth() - (months ? months - 1 : 11), 1);
  if (!months && minDate) {
    const first = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    if (first < start) start.setTime(first.getTime());
  }
  const showYear = !months || months > 12;
  const arr: { key: string; label: string }[] = [];
  for (const d = new Date(start); d < end; d.setMonth(d.getMonth() + 1)) {
    arr.push({ key: monthKey(d), label: monthLabel(d, showYear) });
  }
  return arr;
}

async function buildGlobalDashboard(months: number | null, allowedModulePaths: string[]): Promise<DashboardData> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const rangeStart = months ? new Date(now.getFullYear(), now.getMonth() - (months - 1), 1) : undefined;
  const windowEnd = new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate() + DUE_WINDOW_DAYS, 23, 59, 59);

  const [
    tasa,
    statusAgg,
    monthInvoices,
    paymentRecent,
    paymentsMonthAgg,
    paymentsYear,
    methodAgg,
    customerStatusAgg,
    customerRubroAgg,
    leadStatusAgg,
    leadRecent,
    upcoming,
    overdueTop,
    renewalsCount,
  ] = await Promise.all([
    prisma.tasaBcv.findFirst({ orderBy: { fecha_efectiva: "desc" } }),
    prisma.invoice.groupBy({
      by: ["status"],
      where: { status: { in: [...PENDING_STATUSES] } },
      _sum: { total_usd: true, total_bs: true },
      _count: true,
    }),
    prisma.invoice.findMany({
      where: { issue_date: { gte: rangeStart } },
      select: { issue_date: true, total_usd: true },
    }),
    prisma.payment.findMany({
      orderBy: { payment_date: "desc" },
      take: 20,
      include: { customer: { select: { name: true } } },
    }),
    prisma.payment.groupBy({
      by: ["currency"],
      where: { payment_date: { gte: startOfMonth } },
      _sum: { amount_paid: true },
    }),
    prisma.payment.findMany({
      where: { payment_date: { gte: rangeStart } },
      select: { payment_date: true, amount_paid: true },
    }),
    prisma.payment.groupBy({
      by: ["payment_method"],
      where: { payment_date: { gte: rangeStart } },
      _count: true,
    }),
    prisma.customer.groupBy({ by: ["status"], _count: true }),
    prisma.customer.groupBy({ by: ["rubro"], _count: true }),
    prisma.lead.groupBy({ by: ["status"], _count: true }),
    prisma.lead.findMany({
      orderBy: { created_at: "desc" },
      take: 20,
      select: { nombre: true, apellido: true, nombre_empresa: true, status: true, created_at: true, tipo_lead: true },
    }),
    prisma.invoice.findMany({
      where: {
        status: "SENT",
        proximo_vencimiento_producto: { gte: todayStart, lte: windowEnd },
      },
      orderBy: { proximo_vencimiento_producto: "asc" },
      take: 20,
      include: { customer: { select: { name: true } } },
    }),
    prisma.invoice.findMany({
      where: { status: "OVERDUE" },
      orderBy: { total_usd: "desc" },
      take: 20,
      include: { customer: { select: { name: true } } },
    }),
    prisma.invoice.count({
      where: {
        status: "SENT",
        proximo_vencimiento_producto: { gte: todayStart, lte: windowEnd },
      },
    }),
  ]);

  const round2 = (n: number) => Math.round(n * 100) / 100;

  let pendingUsd = 0;
  let pendingBs = 0;
  let overdueUsd = 0;
  let overdueCount = 0;
  statusAgg.forEach((row) => {
    pendingUsd += Number(row._sum.total_usd ?? 0);
    pendingBs += Number(row._sum.total_bs ?? 0);
    if (row.status === "OVERDUE") {
      overdueUsd += Number(row._sum.total_usd ?? 0);
      overdueCount += row._count;
    }
  });

  let collectedMonthUsd = 0;
  let collectedMonthBs = 0;
  paymentsMonthAgg.forEach((row) => {
    if (row.currency === "USD") collectedMonthUsd += Number(row._sum.amount_paid ?? 0);
    if (row.currency === "BS") collectedMonthBs += Number(row._sum.amount_paid ?? 0);
  });
  collectedMonthUsd = round2(collectedMonthUsd);
  collectedMonthBs = round2(collectedMonthBs);

  const earliest = monthInvoices
    .map((i) => i.issue_date)
    .concat(paymentsYear.map((p) => p.payment_date))
    .reduce<Date | undefined>((min, d) => (min && min <= d ? min : d), undefined);
  const monthBuckets = buildMonthly(months, earliest);
  const chartMap: Record<string, { month: string; facturadoUsd: number; cobradoUsd: number }> = {};
  monthBuckets.forEach((m) => (chartMap[m.key] = { month: m.label, facturadoUsd: 0, cobradoUsd: 0 }));
  monthInvoices.forEach((inv) => {
    const k = monthKey(inv.issue_date);
    if (chartMap[k]) chartMap[k].facturadoUsd = round2(chartMap[k].facturadoUsd + Number(inv.total_usd));
  });
  paymentsYear.forEach((pm) => {
    const k = monthKey(pm.payment_date);
    if (chartMap[k]) chartMap[k].cobradoUsd = round2(chartMap[k].cobradoUsd + Number(pm.amount_paid));
  });

  const methods = methodAgg
    .map((row) => ({ method: row.payment_method || "Sin método", count: row._count }))
    .sort((a, b) => b.count - a.count);
  const topMethods = methods.slice(0, 6);
  const othersCount = methods.slice(6).reduce((acc, m) => acc + m.count, 0);
  if (othersCount > 0) topMethods.push({ method: "Otros", count: othersCount });

  const leads = leadStatusAgg.map((row) => ({ status: row.status, count: row._count }));

  let totalClients = 0;
  let activeClients = 0;
  customerStatusAgg.forEach((row) => {
    totalClients += row._count;
    if (row.status === "ACTIVE") activeClients += row._count;
  });

  const customersByRubro = customerRubroAgg
    .map((row) => ({ rubro: labelRubro(row.rubro), count: row._count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const num = (inv: { invoice_number: number | null; id: string }) =>
    inv.invoice_number ? String(inv.invoice_number).padStart(6, "0") : inv.id.slice(0, 8).toUpperCase();

  const data: DashboardData = {
    kpis: {
      pendingUsd: round2(pendingUsd),
      pendingBs: round2(pendingBs),
      overdueUsd: round2(overdueUsd),
      overdueCount,
      collectedMonthUsd,
      collectedMonthBs,
      activeClients,
      totalClients,
      renewalsSoon: renewalsCount,
    },
    tasa: tasa ? Number(tasa.tasa) : 0,
    charts: {
      monthly: monthBuckets.map((m) => chartMap[m.key]),
      methods: topMethods,
      leads,
    },
    lists: {
      recentPayments: paymentRecent.map((pm) => ({
        id: pm.id,
        customerName: pm.customer?.name ?? "Sin cliente",
        amount: Number(pm.amount_paid),
        currency: pm.currency,
        method: pm.payment_method,
        date: pm.payment_date.toISOString(),
      })),
      upcomingDue: upcoming.map((inv) => ({
        id: inv.id,
        number: num(inv),
        customerName: inv.customer.name,
        status: inv.status,
        type: inv.type,
        totalUsd: Number(inv.total_usd),
        due: inv.proximo_vencimiento_producto?.toISOString() ?? inv.due_date.toISOString(),
      })),
      overdueTop: overdueTop.map((inv) => ({
        id: inv.id,
        number: num(inv),
        customerName: inv.customer.name,
        status: inv.status,
        type: inv.type,
        totalUsd: Number(inv.total_usd),
        due: inv.due_date.toISOString(),
      })),
      customersByRubro,
      recentLeads: leadRecent.map((lead) => ({
        name: `${lead.nombre} ${lead.apellido}`.trim(),
        company: lead.nombre_empresa ?? "",
        status: lead.status,
        date: lead.created_at.toISOString(),
        vip: lead.tipo_lead === "VIP",
      })),
    },
    allowedModulePaths,
  };

  return data;
}

async function buildClienteDashboard(userId: string): Promise<ClienteDashboardData | null> {
  const customer = await prisma.customer.findUnique({
    where: { user_id: userId },
    include: {
      invoices: {
        where: { status: { in: [...PENDING_STATUSES] } },
        orderBy: { due_date: "asc" },
      },
      payments: { orderBy: { payment_date: "desc" }, take: 15 },
    },
  });

  if (!customer) return null;

  const round2 = (n: number) => Math.round(n * 100) / 100;
  let pendingUsd = 0;
  let pendingBs = 0;
  let overdueUsd = 0;
  let overdueCount = 0;
  customer.invoices.forEach((inv) => {
    pendingUsd += Number(inv.total_usd);
    pendingBs += Number(inv.total_bs);
    if (inv.status === "OVERDUE") {
      overdueUsd += Number(inv.total_usd);
      overdueCount += 1;
    }
  });

  const now = new Date();
  const nextRenewal =
    customer.invoices
      .filter((inv) => inv.proximo_vencimiento_producto && inv.proximo_vencimiento_producto >= now)
      .sort((a, b) => (a.proximo_vencimiento_producto as Date).getTime() - (b.proximo_vencimiento_producto as Date).getTime())[0] ?? null;

  const num = (inv: { invoice_number: number | null; id: string }) =>
    inv.invoice_number ? String(inv.invoice_number).padStart(6, "0") : inv.id.slice(0, 8).toUpperCase();

  return {
    name: customer.name,
    doc_number: customer.doc_number,
    pendingUsd: round2(pendingUsd),
    pendingBs: round2(pendingBs),
    overdueUsd: round2(overdueUsd),
    overdueCount,
    nextRenewal: nextRenewal?.proximo_vencimiento_producto?.toISOString() ?? null,
    invoices: customer.invoices.map((inv) => ({
      id: inv.id,
      number: num(inv),
      status: inv.status,
      type: inv.type,
      due_date: inv.due_date.toISOString(),
      proximo_vencimiento_producto: inv.proximo_vencimiento_producto?.toISOString() ?? null,
      total_usd: Number(inv.total_usd),
    })),
    payments: customer.payments.map((pm) => ({
      id: pm.id,
      amount: Number(pm.amount_paid),
      currency: pm.currency,
      method: pm.payment_method,
      reference: pm.reference,
      date: pm.payment_date.toISOString(),
    })),
  };
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ rango?: string }> }) {
  const session = await auth();
  const { rango } = await searchParams;
  const VALID_RANGES = ["3", "6", "12", "24", "36", "todo"] as const;
  const validRange = (VALID_RANGES as readonly string[]).includes(rango ?? "12") ? (rango ?? "12") : "12";
  const months: number | null = validRange === "todo" ? null : Number(validRange);
  const rangeLabel = months ? `${months} meses` : "Todo el historial";

  if (!session) {
    redirect("/auth/login");
  }

  if (session.user.role === "CLIENTE") {
    const [clienteData, tasa] = await Promise.all([
      buildClienteDashboard(session.user.id),
      prisma.tasaBcv.findFirst({ orderBy: { fecha_efectiva: "desc" } }),
    ]);

    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Mi Dashboard</h2>
          <p className="text-sm text-slate-500 italic">
            Resumen personal de tus facturas, deudas y renovaciones.
          </p>
        </div>
        <DashboardClienteView data={clienteData} tasa={tasa ? Number(tasa.tasa) : 0} />
      </div>
    );
  }

  const data = await buildGlobalDashboard(months, await getAllowedModulePaths(session.user.id, session.user.role));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Dashboard</h2>
          <p className="text-sm text-slate-500 italic">
            Indicadores de facturación, cobranza, clientes y leads.
          </p>
        </div>
        <DashboardRangeSelector current={validRange} />
      </div>
      <DashboardPageClient data={data} rangeLabel={rangeLabel} />
    </div>
  );
}