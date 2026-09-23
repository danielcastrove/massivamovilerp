// massivamovilerp/src/app/dashboard/facturacion/edit/[id]/page.tsx
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import InvoiceForm from "@/components/facturacion/InvoiceForm";
import { prisma } from "@/lib/db";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarFacturaPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  if (!session) {
    redirect("/auth/login");
  }

  // Fetch initial data on the server in parallel
  const [invoice, customers, latestBcvRate, priceLists] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        invoice_items: {
          include: {
            product: true
          }
        },
        customer: true
      }
    }),
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      include: {
        user: { select: { nombre: true, apellido: true, email: true, telefono_celular: true } }
      }
    }),
    prisma.tasaBcv.findFirst({
      orderBy: { fecha_efectiva: "desc" },
    }),
    prisma.priceList.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    })
  ]);

  if (!invoice) {
    notFound();
  }

  // Convert Decimal to number for serialization
  const serializedCustomers = customers.map(c => {
    const contactInfo = (c.persona_contacto_info as any) || {};
    return {
      ...c,
      razon_social: c.name,
      empresa_rif: c.doc_number,
      empresa_email: c.email || "Sin email",
      empresa_telefono: c.telefono_empresa || "Sin teléfono",
      empresa_direccion: c.direccion_fiscal || "Sin dirección",
      contacto_nombre: contactInfo.nombre || (c.user ? `${c.user.nombre || ""} ${c.user.apellido || ""}`.trim() : "Sin nombre"),
      contacto_email: contactInfo.email || c.user?.email || "Sin email",
      contacto_telefono: contactInfo.telefono || contactInfo.telefono_celular || c.user?.telefono_celular || "Sin teléfono",
      contacto_cargo: contactInfo.cargo || "N/A",
      contacto_cedula: contactInfo.cedula || "N/A",
      porcent_retencion_islr: c.porcent_retencion_islr?.toNumber() || 0,
      porcent_retencion_iva: c.porcent_retencion_iva?.toNumber() || 0,
      porcent_retencion_municipio: c.porcent_retencion_municipio?.toNumber() || 0,
    };
  });

  const bcvRate = latestBcvRate ? latestBcvRate.tasa.toNumber() : 0;

  // Serializar la factura para el formulario
  const initialInvoiceData = {
    id: invoice.id,
    customerId: invoice.customer_id,
    type: invoice.type,
    due_date: invoice.due_date.toISOString().split('T')[0],
    invoice_number: invoice.invoice_number ?? undefined,
    control_number: invoice.control_number ?? undefined,
    items: invoice.invoice_items.map(item => ({
      priceListId: item.price_list_id || "",
      productId: item.product_id || "",
      isCustom: item.is_custom,
      customName: item.custom_name || "",
      quantity: Number(item.quantity),
      unitPriceUsd: Number(item.unit_price_usd),
      totalUsd: Number(item.total_usd),
    }))
  };

  return (
    <div className="w-full">
      <InvoiceForm 
        initialCustomers={serializedCustomers} 
        initialBcvRate={bcvRate} 
        initialPriceLists={priceLists}
        initialInvoiceData={initialInvoiceData}
      />
    </div>
  );
}
