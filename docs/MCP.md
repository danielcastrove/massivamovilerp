# Conexión de IAs (Claude, etc.) vía MCP

El ERP expone un servidor **MCP (Model Context Protocol)** en `/api/mcp` para que IAs como Claude se conecten de forma segura y de solo lectura al sistema.

## Cómo funciona

```
Claude (Code / Desktop / claude.ai)
        │  header: x-api-key: sk-...
        ▼
POST /api/mcp  (Streamable HTTP, stateless)
        │  valida la API key (hash SHA-256, expiración, activa)
        │  registra SOLO los tools de lectura permitidos por la key
        ▼
Tool p.ej. list_customers
        ▼
GET /api/customers  (ruta existente → allowlist + rate limit + lógica de negocio)
```

Características de seguridad:

- **Solo lectura**: los tools MCP solo invocan métodos `GET`, aunque la key tenga permisos de escritura.
- **Allowlist por key**: cada API key define sus endpoints; la IA solo ve los tools que su key permite.
- **API key hasheada**: se almacena como SHA-256, nunca en claro; se muestra una sola vez al crearla.
- **Expiración y activación**: keys expiradas o desactivadas reciben 401.
- **Rate limit persistente**: contador en PostgreSQL (no en memoria), compartido entre instancias y sobrevive reinicios.
- **Gestión exclusiva MASSIVA_ADMIN**: solo el admin crea/revoca keys en `/dashboard/api-keys`.

## 1. Crear la API key (solo admin)

1. Ir a **Dashboard → API Keys** (`/dashboard/api-keys`).
2. **Nueva API Key** → usar el preset **"Solo lectura (IA/MCP)"** (marca solo `GET` de todos los endpoints).
3. Recomendado: poner **Expiración** (máx. 90 días) y **Rate Limit** (p.ej. 60 req/min).
4. Copiar la key (`sk-...`) — **solo se muestra una vez**.

## 2. Conectar desde Claude Code

```bash
claude mcp add --transport http massiva-erp \
  http://localhost:3000/api/mcp \
  --header "x-api-key: sk-TU_AQUI"
```

En producción, reemplazar `http://localhost:3000` por el dominio desplegado (p.ej. `https://tu-dominio.vercel.app`).

## 3. Conectar desde Claude Desktop / claude.ai

Claude Desktop y los conectores remotos de claude.ai no siempre permiten headers personalizados. Usar el proxy `mcp-remote`:

```bash
npx mcp-remote http://localhost:3000/api/mcp \
  --header "x-api-key:${API_KEY}"
```

Configuración en `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "massiva-erp": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://TU_DOMINIO/api/mcp",
        "--header",
        "x-api-key:${API_KEY}"
      ],
      "env": { "API_KEY": "sk-TU_AQUI" }
    }
  }
}
```

También se acepta `Authorization: Bearer sk-...` en lugar de `x-api-key`.

## Tools disponibles (solo lectura)

| Tool | Endpoint | Argumentos |
|---|---|---|
| `list_customers` | `GET /api/customers` | — |
| `list_invoices` | `GET /api/invoices` | — |
| `list_products` | `GET /api/products` | `priceListId?` |
| `list_leads` | `GET /api/leads` | — |
| `list_payments` | `GET /api/payments` | — |
| `get_payment` | `GET /api/payments/:id` | `id` |
| `list_product_prices` | `GET /api/productprices` | `price_list_id?`, `product_id?` |
| `list_categories` | `GET /api/categories` | — |

Los tools disponibles se **filtran dinámicamente** según `allowed_endpoints` de la key: si la key solo permite `GET:/api/customers/*`, la IA solo verá `list_customers`.

## Verificar la conexión

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "content-type: application/json" \
  -H "accept: application/json, text/event-stream" \
  -H "x-api-key: sk-TU_AQUI" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Respuesta esperada: JSON con `result.tools` (la lista de tools permitidos).

Errores:

| Código | Causa |
|---|---|
| 401 `missing_api_key` | No se envió la key |
| 401 `invalid_api_key` | Key inválida, desactivada o expirada |
| 429 `rate_limited` | Rate limit excedido |
| 406 | Falta `Accept: application/json, text/event-stream` (clientes MCP estándar lo envían) |

## Cómo funciona el rate limit

- Ventana fija de 60 segundos por key, contador en tabla `ApiKeyRateLimit` (Postgres).
- Cada `tools/call` consume 1 unidad (lo consume la ruta subyacente); los mensajes de protocolo (`initialize`, `tools/list`) también consumen.
- Las ventanas de más de 24 h se limpian con el cron diario `/api/cron/clean-rate-limits`.
