import { Metadata } from "next";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CobranzasPageClient from "@/components/cobranzas/CobranzasPageClient";

export const metadata: Metadata = {
  title: "Dashboard de Cobranzas | MassivaMovil ERP",
  description: "Monitor de deudores y gestión de facturas pendientes.",
};

export default async function CobranzasPage() {
  const session = await auth();

  if (!session || (session.user.role !== "MASSIVA_ADMIN" && session.user.role !== "MASSIVA_EXTRA")) {
    redirect("/auth/login");
  }

  // Fetch initial data in parallel to eliminate waterfalls (Vercel Best Practice 3.5)
  const [latestTasa, customersWithDebt] = await Promise.all([
    prisma.tasaBcv.findFirst({
      orderBy: { fecha_efectiva: "desc" },
    }),
    prisma.customer.findMany({
      where: {
        invoices: {
          some: {
            status: { in: ["SENT", "PARTIAL", "OVERDUE"] }
          }
        }
      },
      include: {
        invoices: {
          where: {
            status: { in: ["SENT", "PARTIAL", "OVERDUE"] }
          },
          include: {
            invoice_items: { include: { product: true } }
          },
          orderBy: { proximo_vencimiento_producto: "asc" }
        }
      }
    })
  ]);

  // 3. Serializar y Agrupar Datos de Clientes
  const serializedCustomers = customersWithDebt.map(customer => {
    const totalUsd = customer.invoices.reduce((acc, inv) => acc + Number(inv.total_usd), 0);
    const totalBs = customer.invoices.reduce((acc, inv) => acc + Number(inv.total_bs), 0);
    const oldestInvoice = customer.invoices[0]; 

    return {
      id: customer.id,
      name: customer.name,
      doc_number: customer.doc_number,
      total_usd: totalUsd,
      total_bs: totalBs,
      invoice_count: customer.invoices.length,
      oldest_due_date: oldestInvoice?.proximo_vencimiento_producto?.toISOString() || oldestInvoice?.due_date.toISOString(),
      status: customer.invoices.some(inv => inv.status === "OVERDUE") ? "OVERDUE" : "PENDING",
      invoices: customer.invoices.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        status: inv.status,
        type: inv.type,
        issue_date: inv.issue_date.toISOString(),
        due_date: inv.due_date.toISOString(),
        proximo_vencimiento_producto: inv.proximo_vencimiento_producto?.toISOString() || null,
        currency_rate: Number(inv.currency_rate),
        subtotal_usd: Number(inv.subtotal_usd),
        tax_amount_usd: Number(inv.tax_amount_usd),
        igtf_amount_usd: Number(inv.igtf_amount_usd),
        total_usd: Number(inv.total_usd),
        total_bs: Number(inv.total_bs),
        customer: {
          name: customer.name,
          doc_number: customer.doc_number
        },
        invoice_items: inv.invoice_items.map(item => ({
          quantity: Number(item.quantity),
          unit_price_usd: Number(item.unit_price_usd),
          total_usd: Number(item.total_usd),
          product: item.product ? { name: item.product.name } : null,
          custom_name: item.custom_name,
        }))
      }))
    };
  });

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Centro de Cobranzas</h2>
          <p className="text-sm text-slate-500 italic">
            Supervisión de deudores y registro de cobros por servicios.
          </p>
        </div>
      </div>
      
      <CobranzasPageClient 
        initialCustomers={serializedCustomers} 
        bcvRate={latestTasa ? Number(latestTasa.tasa) : 0} 
      />
    </div>
  );
}
