// massivamovilerp/src/app/dashboard/facturacion/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import InvoicePageClient from "@/components/facturacion/InvoicePageClient";
import { prisma } from "@/lib/db";

export default async function FacturacionPage() {
  const session = await auth();

  if (!session || (session.user.role !== "MASSIVA_ADMIN" && session.user.role !== "MASSIVA_EXTRA")) {
    redirect("/auth/login");
  }

  // Fetch invoices and payments in parallel (Vercel Best Practice 3.5)
  const [invoices, payments] = await Promise.all([
    prisma.invoice.findMany({
      include: {
        customer: {
          select: {
            name: true,
            doc_number: true,
            direccion_fiscal: true,
            persona_contacto_info: true,
            telefono_empresa: true,
            email: true,
            is_agente_retencion: true,
            porcent_retencion_iva: true,
            porcent_retencion_islr: true,
            porcent_retencion_municipio: true,
          }
        },
        invoice_items: {
          include: {
            product: {
              select: {
                sku: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { issue_date: "desc" }
    }),
    prisma.payment.findMany({
      include: {
        customer: { select: { name: true, doc_number: true } }
      },
      orderBy: { payment_date: "desc" },
      take: 100
    })
  ]);

  // Serialize only necessary fields to reduce payload size (Vercel Best Practice 3.4)
  const serializedInvoices = invoices.map(invoice => ({
    id: invoice.id,
    invoice_number: invoice.invoice_number ?? undefined,
    control_number: invoice.control_number ?? undefined,
    type: invoice.type,
    status: invoice.status,
    currency_mode: (invoice as any).currency_mode,
    issue_date: invoice.issue_date.toISOString(),
    due_date: invoice.due_date.toISOString(),
    proximo_vencimiento_producto: invoice.proximo_vencimiento_producto?.toISOString() ?? null,
    currency_rate: Number(invoice.currency_rate),
    subtotal_usd: Number(invoice.subtotal_usd),
    tax_amount_usd: Number(invoice.tax_amount_usd),
    igtf_amount_usd: Number(invoice.igtf_amount_usd),
    total_usd: Number(invoice.total_usd),
    subtotal_bs: Number(invoice.subtotal_bs),
    tax_amount_bs: Number(invoice.tax_amount_bs),
    total_bs: Number(invoice.total_bs),
    retention_amount_bs: Number(invoice.retention_amount_bs),
    customer: {
      name: invoice.customer.name,
      doc_number: invoice.customer.doc_number,
      direccion_fiscal: invoice.customer.direccion_fiscal ?? undefined,
      persona_contacto_info: invoice.customer.persona_contacto_info ?? undefined,
      telefono_empresa: invoice.customer.telefono_empresa ?? undefined,
      email: invoice.customer.email ?? undefined,
      ...(invoice.customer as any).porcent_retencion_iva !== undefined && { porcent_retencion_iva: Number((invoice.customer as any).porcent_retencion_iva) },
      ...(invoice.customer as any).porcent_retencion_islr !== undefined && { porcent_retencion_islr: Number((invoice.customer as any).porcent_retencion_islr) },
      ...(invoice.customer as any).porcent_retencion_municipio !== undefined && { porcent_retencion_municipio: Number((invoice.customer as any).porcent_retencion_municipio) },
    },
    invoice_items: invoice.invoice_items.map(item => ({
      quantity: Number(item.quantity),
      unit_price_usd: Number(item.unit_price_usd),
      total_usd: Number(item.total_usd),
      product: item.product,
    }))
  }));

  const serializedPayments = payments.map(p => ({
    id: p.id,
    type: p.type,
    payment_date: p.payment_date.toISOString(),
    amount_paid: Number(p.amount_paid),
    currency: p.currency,
    exchange_rate: Number(p.exchange_rate),
    payment_method: p.payment_method,
    reference: p.reference ?? undefined,
    evidence_url: p.evidence_url ?? undefined,
    customer: p.customer ? { name: p.customer.name, doc_number: p.customer.doc_number } : { name: '', doc_number: '' },
  }));

  return (
    <div className="w-full">
      <InvoicePageClient 
        initialInvoices={serializedInvoices} 
        initialPayments={serializedPayments} 
      />
    </div>
  );
}
