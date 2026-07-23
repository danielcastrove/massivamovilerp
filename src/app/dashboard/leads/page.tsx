import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LeadsPageClient, { Lead } from "@/components/leads/LeadsPageClient";
import { prisma } from "@/lib/db";
import { Spinner } from "@/components/ui/spinner";

async function LeadsList() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const leads = await prisma.lead.findMany({
    include: {
      product: { select: { name: true } },
      priceList: { select: { name: true } }
    },
    orderBy: { created_at: 'desc' }
  });

  // Convert dates to strings to be serialized for client components
  const serializedLeads = leads.map(lead => ({
    ...lead,
    fecha_contacto: lead.fecha_contacto.toISOString(),
    fecha_llamada: lead.fecha_llamada?.toISOString() || null,
    created_at: lead.created_at.toISOString(),
    updated_at: lead.updated_at.toISOString(),
  })) as Lead[];

  return <LeadsPageClient initialLeads={serializedLeads} />;
}

export default function LeadsPage() {
  return (
    <div className="w-full">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center py-24">
          <Spinner className="h-12 w-12 text-cyan-600 mb-4" />
          <p className="text-slate-500 font-medium animate-pulse text-lg">Sincronizando prospectos...</p>
        </div>
      }>
        <LeadsList />
      </Suspense>
    </div>
  );
}
