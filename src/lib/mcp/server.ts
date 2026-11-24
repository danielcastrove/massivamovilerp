import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import {
  WebStandardStreamableHTTPServerTransport,
} from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { NextRequest } from "next/server";
import {
  validateApiKey,
  isEndpointAllowed,
  type HttpMethod,
} from "@/lib/apikey-auth";
import { checkRateLimit } from "@/lib/apikey-guard";

import { GET as listCustomersHandler } from "@/app/api/customers/route";
import { GET as listInvoicesHandler } from "@/app/api/invoices/route";
import { GET as listProductsHandler } from "@/app/api/products/route";
import { GET as listLeadsHandler } from "@/app/api/leads/route";
import { GET as listPaymentsHandler } from "@/app/api/payments/route";
import { GET as getPaymentHandler } from "@/app/api/payments/[id]/route";
import { GET as listProductPricesHandler } from "@/app/api/productprices/route";
import { GET as listCategoriesHandler } from "@/app/api/categories/route";

const SERVER_INFO = { name: "massivamovil-erp", version: "1.0.0" };
const MAX_OUTPUT_CHARS = 40_000;

export interface ToolContext {
  apiKey: string;
  allowedEndpoints: string[];
}

interface RouteCall {
  path: string;
  query?: Record<string, string | undefined>;
  params?: { id: string };
}

type ListHandler = (req: NextRequest) => Promise<Response>;
type ParamsHandler = (
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) => Promise<Response>;

async function callRoute(
  handler: ListHandler | ParamsHandler,
  call: RouteCall,
  ctx: ToolContext
): Promise<Response> {
  const url = new URL(call.path, "http://mcp.internal");
  for (const [key, value] of Object.entries(call.query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  }

  const request = new NextRequest(url, {
    method: "GET",
    headers: { "x-api-key": ctx.apiKey },
  });

  if (call.params) {
    return (handler as ParamsHandler)(request, {
      params: Promise.resolve(call.params),
    });
  }
  return (handler as ListHandler)(request);
}

async function toToolOutput(
  handler: ListHandler | ParamsHandler,
  call: RouteCall,
  ctx: ToolContext
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    const res = await callRoute(handler, call, ctx);
    const body = await res.text();

    if (!res.ok) {
      let detail = body;
      try {
        const parsed = JSON.parse(body);
        detail = parsed.message || parsed.error || body;
      } catch {
        // keep raw body
      }
      return {
        content: [{ type: "text", text: `Error HTTP ${res.status}: ${detail}` }],
        isError: true,
      };
    }

    let text = body;
    if (text.length > MAX_OUTPUT_CHARS) {
      text =
        text.slice(0, MAX_OUTPUT_CHARS) +
        "\n\n[Respuesta truncada por longitud. Refina los parámetros de la consulta para obtener menos datos.]";
    }
    return { content: [{ type: "text", text }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return {
      content: [{ type: "text", text: `Error al ejecutar la herramienta: ${message}` }],
      isError: true,
    };
  }
}

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  openWorldHint: false,
} as const;

function registerTools(server: McpServer, ctx: ToolContext): number {
  let registered = 0;
  // `can()` is called exactly once per tool definition; increment on success so
  // `registered` reflects the number of tools actually added below.
  const can = (path: string, method: HttpMethod = "GET") => {
    const allowed = isEndpointAllowed(path, ctx.allowedEndpoints, method);
    if (allowed) registered++;
    return allowed;
  };

  if (can("/api/customers")) {
    server.registerTool(
      "list_customers",
      {
        title: "Listar clientes",
        description:
          "Devuelve todos los clientes registrados en el ERP, incluyendo datos de contacto y usuario asociado.",
        annotations: READ_ONLY_ANNOTATIONS,
      },
      async () => toToolOutput(listCustomersHandler as ListHandler, { path: "/api/customers" }, ctx)
    );
  }

  if (can("/api/invoices")) {
    server.registerTool(
      "list_invoices",
      {
        title: "Listar facturas",
        description:
          "Devuelve todas las facturas con su cliente, productos facturados e importes (USD/BS), ordenadas por fecha de emisión descendente.",
        annotations: READ_ONLY_ANNOTATIONS,
      },
      async () => toToolOutput(listInvoicesHandler as ListHandler, { path: "/api/invoices" }, ctx)
    );
  }

  if (can("/api/products")) {
    server.registerTool(
      "list_products",
      {
        title: "Listar productos",
        description:
          "Devuelve el catálogo de productos con categorías, ciclo de facturación y precios por lista de precios.",
        inputSchema: {
          priceListId: z
            .string()
            .optional()
            .describe("ID de lista de precios para filtrar solo los precios de esa lista"),
        },
        annotations: READ_ONLY_ANNOTATIONS,
      },
      async (input: { priceListId?: string }) =>
        toToolOutput(
          listProductsHandler as ListHandler,
          { path: "/api/products", query: { priceListId: input?.priceListId } },
          ctx
        )
    );
  }

  if (can("/api/leads")) {
    server.registerTool(
      "list_leads",
      {
        title: "Listar leads",
        description:
          "Devuelve los leads (prospectos) con su producto y lista de precios asociados, ordenados por fecha de creación descendente.",
        annotations: READ_ONLY_ANNOTATIONS,
      },
      async () => toToolOutput(listLeadsHandler as ListHandler, { path: "/api/leads" }, ctx)
    );
  }

  if (can("/api/payments")) {
    server.registerTool(
      "list_payments",
      {
        title: "Listar pagos",
        description:
          "Devuelve los pagos registrados y las facturas renovables en la ventana de ±7 días.",
        annotations: READ_ONLY_ANNOTATIONS,
      },
      async () => toToolOutput(listPaymentsHandler as ListHandler, { path: "/api/payments" }, ctx)
    );
  }

  if (can("/api/payments")) {
    server.registerTool(
      "get_payment",
      {
        title: "Obtener pago",
        description:
          "Devuelve el detalle de un pago específico por su ID.",
        inputSchema: {
          id: z.string().describe("ID del pago"),
        },
        annotations: READ_ONLY_ANNOTATIONS,
      },
      async (input: { id: string }) =>
        toToolOutput(
          getPaymentHandler as ParamsHandler,
          { path: `/api/payments/${input.id}`, params: { id: input.id } },
          ctx
        )
    );
  }

  if (can("/api/productprices")) {
    server.registerTool(
      "list_product_prices",
      {
        title: "Listar precios de productos",
        description:
          "Devuelve los precios de productos. Requiere price_list_id (precios de una lista) o product_id (precios de un producto).",
        inputSchema: {
          price_list_id: z.string().optional().describe("ID de la lista de precios"),
          product_id: z.string().optional().describe("ID del producto"),
        },
        annotations: READ_ONLY_ANNOTATIONS,
      },
      async (input: { price_list_id?: string; product_id?: string }) =>
        toToolOutput(
          listProductPricesHandler as ListHandler,
          {
            path: "/api/productprices",
            query: { price_list_id: input?.price_list_id, product_id: input?.product_id },
          },
          ctx
        )
    );
  }

  if (can("/api/categories")) {
    server.registerTool(
      "list_categories",
      {
        title: "Listar categorías",
        description: "Devuelve las categorías de productos ordenadas por nombre.",
        annotations: READ_ONLY_ANNOTATIONS,
      },
      async () => toToolOutput(listCategoriesHandler as ListHandler, { path: "/api/categories" }, ctx)
    );
  }

  return registered;
}

function createMcpServer(ctx: ToolContext): McpServer {
  const server = new McpServer(SERVER_INFO);
  const registered = registerTools(server, ctx);

  // McpServer only wires the tools/list handler when the first tool is
  // registered. With zero allowed endpoints, expose an empty list instead of
  // letting clients hit "Method not found".
  if (registered === 0) {
    server.server.registerCapabilities({ tools: { listChanged: true } });
    server.server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: [] }));
  }

  return server;
}

function extractApiKey(req: Request): string | null {
  const xApiKey = req.headers.get("x-api-key");
  if (xApiKey) return xApiKey.trim();

  const authorization = req.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }
  return null;
}

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

function containsToolsCall(body: unknown): boolean {
  if (Array.isArray(body)) return body.some(containsToolsCall);
  if (body && typeof body === "object") {
    return (body as { method?: unknown }).method === "tools/call";
  }
  return false;
}

export async function handleMcpRequest(req: Request): Promise<Response> {
  const apiKey = extractApiKey(req);
  if (!apiKey) {
    return jsonResponse(401, {
      error: "missing_api_key",
      message:
        "API key requerida. Envíela en el header 'x-api-key' o como 'Authorization: Bearer sk-...'.",
    });
  }

  const validation = await validateApiKey(apiKey);
  if (!validation.valid) {
    return jsonResponse(401, {
      error: "invalid_api_key",
      message: validation.error || "API key inválida",
    });
  }

  let parsedBody: unknown;
  if (req.method === "POST") {
    try {
      parsedBody = await req.json();
    } catch {
      return jsonResponse(400, { error: "invalid_json", message: "Cuerpo JSON inválido." });
    }
  }

  // tools/call already consumes rate limit inside each underlying route handler;
  // protocol messages (initialize, tools/list, ...) are limited here instead.
  if (validation.rateLimit && validation.keyId && !containsToolsCall(parsedBody)) {
    if (!(await checkRateLimit(validation.keyId, validation.rateLimit))) {
      return jsonResponse(429, {
        error: "rate_limited",
        message: "Límite de solicitudes excedido",
      });
    }
  }

  const ctx: ToolContext = {
    apiKey,
    allowedEndpoints: validation.allowedEndpoints ?? [],
  };

  const server = createMcpServer(ctx);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  transport.onclose = () => {
    server.close().catch(() => undefined);
  };

  await server.connect(transport);
  return transport.handleRequest(
    req as unknown as Parameters<WebStandardStreamableHTTPServerTransport["handleRequest"]>[0],
    { parsedBody }
  );
}
