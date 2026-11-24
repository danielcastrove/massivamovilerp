import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateApiKey, isEndpointAllowed, type HttpMethod } from "@/lib/apikey-auth";
import type { Session } from "next-auth";

const WINDOW_MS = 60_000;

function currentWindowStart(): Date {
  return new Date(Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS);
}

/**
 * Fixed-window rate limit persisted in Postgres (ApiKeyRateLimit table).
 * The upsert is atomic (count increment), so the limit holds across
 * serverless instances and process restarts.
 * Returns true if the request is allowed.
 */
export async function checkRateLimit(keyId: string, limit: number): Promise<boolean> {
  const windowStart = currentWindowStart();

  try {
    const row = await prisma.apiKeyRateLimit.upsert({
      where: {
        key_id_window_start: { key_id: keyId, window_start: windowStart },
      },
      create: { key_id: keyId, window_start: windowStart, count: 1 },
      update: { count: { increment: 1 } },
      select: { count: true },
    });

    return row.count <= limit;
  } catch (error) {
    // Fail open: never break the API because of rate-limit storage issues
    console.error("Rate limit check failed, allowing request:", error);
    return true;
  }
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
    if (!(await checkRateLimit(validation.keyId, validation.rateLimit))) {
      return NextResponse.json(
        { message: "Límite de solicitudes excedido" },
        { status: 429 }
      );
    }
  }

  return handler({ fromApiKey: true, session: null });
}
