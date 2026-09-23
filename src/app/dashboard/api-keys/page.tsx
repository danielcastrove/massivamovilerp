import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import ApiKeyPageClient from "@/components/apikeys/ApiKeyPageClient";

export default async function ApiKeysPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/login");
  }

  if (session.user.role !== "MASSIVA_ADMIN") {
    redirect("/dashboard");
  }

  const apiKeys = await prisma.apiKey.findMany({
    where: { created_by: session.user.id },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      key_prefix: true,
      description: true,
      allowed_endpoints: true,
      is_active: true,
      expires_at: true,
      rate_limit: true,
      created_at: true,
    },
  });

  const serialized = apiKeys.map((k) => ({
    ...k,
    allowed_endpoints: k.allowed_endpoints as string[],
    expires_at: k.expires_at?.toISOString() ?? null,
    created_at: k.created_at.toISOString(),
  }));

  return (
    <div className="w-full">
      <ApiKeyPageClient initialApiKeys={serialized} />
    </div>
  );
}
