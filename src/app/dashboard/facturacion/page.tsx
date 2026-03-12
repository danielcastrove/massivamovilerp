// massivamovilerp/src/app/dashboard/facturacion/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import InvoicePageClient from "@/components/facturacion/InvoicePageClient";

export default async function FacturacionPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/login");
  }

  return (
    <div className="w-full">
      <InvoicePageClient />
    </div>
  );
}
