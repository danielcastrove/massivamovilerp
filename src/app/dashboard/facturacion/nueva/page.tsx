// massivamovilerp/src/app/dashboard/facturacion/nueva/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import InvoiceForm from "@/components/facturacion/InvoiceForm";
import { prisma } from "@/lib/db";

export default async function NuevaFacturaPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/login");
  }

  // Fetch initial data on the server in parallel
  const [customers, latestBcvRate, priceLists] = await Promise.all([
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

  // Convert Decimal to number for serialization
  const serializedCustomers = customers.map(c => {
    // Extraer info de contacto del JSON
    const contactInfo = (c.persona_contacto_info as any) || {};
    
    return {
      ...c,
      // Datos de la Empresa (Entidad Fiscal)
      razon_social: c.name,
      empresa_rif: c.doc_number,
      empresa_email: c.email || "Sin email",
      empresa_telefono: c.telefono_empresa || "Sin teléfono",
      empresa_direccion: c.direccion_fiscal || "Sin dirección",
      
      // Datos del Contacto (Desglosados de persona_contacto_info)
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

  return (
    <div className="w-full">
      <InvoiceForm 
        initialCustomers={serializedCustomers} 
        initialBcvRate={bcvRate} 
        initialPriceLists={priceLists}
      />
    </div>
  );
}
