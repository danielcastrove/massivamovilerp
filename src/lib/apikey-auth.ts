import { prisma } from "@/lib/db";
import { createHash } from "crypto";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface ApiKeyValidation {
  valid: boolean;
  keyId?: string;
  allowedEndpoints?: string[];
  rateLimit?: number | null;
  error?: string;
}

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Match a request path against an allowed endpoint pattern.
 * Supports two formats:
 *   - Legacy: "/api/customers/*" (matches any method on that path)
 *   - Method-specific: "GET:/api/customers/*" (matches only GET on that path)
 */
function matchPattern(requestPath: string, pattern: string): boolean {
  const colonIdx = pattern.indexOf(":");
  let pathPattern = pattern;
  // If pattern contains a colon (method prefix), extract just the path
  if (colonIdx !== -1) {
    pathPattern = pattern.slice(colonIdx + 1);
  }

  if (pathPattern.endsWith("/*")) {
    const prefix = pathPattern.slice(0, -2);
    return requestPath === prefix || requestPath.startsWith(prefix + "/");
  }
  return requestPath === pathPattern;
}

export function matchEndpoint(
  requestPath: string,
  pattern: string
): boolean {
  return matchPattern(requestPath, pattern);
}

export async function validateApiKey(key: string): Promise<ApiKeyValidation> {
  if (!key || !key.startsWith("sk-")) {
    return { valid: false, error: "Formato de API key inválido" };
  }

  const keyHash = hashKey(key);

  const apiKey = await prisma.apiKey.findUnique({
    where: { key_hash: keyHash },
    select: {
      id: true,
      is_active: true,
      expires_at: true,
      allowed_endpoints: true,
      rate_limit: true,
    },
  });

  if (!apiKey) {
    return { valid: false, error: "API key no encontrada" };
  }

  if (!apiKey.is_active) {
    return { valid: false, error: "API key desactivada" };
  }

  if (apiKey.expires_at && new Date() > apiKey.expires_at) {
    return { valid: false, error: "API key expirada" };
  }

  return {
    valid: true,
    keyId: apiKey.id,
    allowedEndpoints: apiKey.allowed_endpoints as string[],
    rateLimit: apiKey.rate_limit,
  };
}

/**
 * Check if the given method + path is allowed.
 * If a pattern is method-prefixed (e.g. "GET:/api/customers/*"), only that method matches.
 * If a pattern has no method prefix (e.g. "/api/customers/*"), it matches any method.
 */
export function isEndpointAllowed(
  requestPath: string,
  allowedEndpoints: string[],
  method?: HttpMethod
): boolean {
  return allowedEndpoints.some((pattern) => {
    const colonIdx = pattern.indexOf(":");
    if (colonIdx !== -1 && method) {
      // Method-specific pattern
      const patternMethod = pattern.slice(0, colonIdx).toUpperCase();
      return (
        patternMethod === method.toUpperCase() &&
        matchPattern(requestPath, pattern)
      );
    }
    // Legacy path-only pattern — matches any method
    return matchPattern(requestPath, pattern);
  });
}
