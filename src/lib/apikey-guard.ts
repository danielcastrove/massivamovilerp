import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateApiKey, isEndpointAllowed, type HttpMethod } from "@/lib/apikey-auth";
import type { Session } from "next-auth";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(keyId: string, limit: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(keyId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(keyId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

export interface AuthContext {
  fromApiKey: boolean;
  session: Session | null;
}

export async function withApiKeyAuth(
  req: Request,
  handler: (ctx?: AuthContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const session = await auth();
  if (session?.user) {
    return handler({ fromApiKey: false, session });
  }

  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json(
      { message: "No autorizado. Proporcione una API key válida." },
      { status: 401 }
    );
  }

  const validation = await validateApiKey(apiKey);
  if (!validation.valid) {
    return NextResponse.json(
      { message: validation.error || "API key inválida" },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const requestPath = url.pathname;
  const method = (req.method || "GET").toUpperCase() as HttpMethod;

  if (!isEndpointAllowed(requestPath, validation.allowedEndpoints!, method)) {
    return NextResponse.json(
      { message: "Endpoint no permitido para esta API key" },
      { status: 403 }
    );
  }

  if (validation.rateLimit && validation.keyId) {
    if (!checkRateLimit(validation.keyId, validation.rateLimit)) {
      return NextResponse.json(
        { message: "Límite de solicitudes excedido" },
        { status: 429 }
      );
    }
  }

  return handler({ fromApiKey: true, session: null });
}
