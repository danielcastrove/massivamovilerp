# MassivaMovil ERP — Agent Guidance

# Contexto
Para entrar en contexto con el proyecto, recuerdes lo que hemos hecho y seguir con el plan la planificación y las pruebas sigue los siguientes pasos: 1. Sigue las reglas del proyecto, las reglas globales y de gemini cli si estamos alli, lee el archivo "gemini.md" si existe. 2. Para entrar en contexto con el proyecto "MassivaMovil ERP" que estamos haciendo lee el archivo README.md, y para ver el resumen del proyecto de como va leer el archivo: "gemini.md" o "README.md". muchos archivos .md se encuentran en la carpeta superior del proyecto, no masivamovilerp sino masivamovilErp,la ruta del proyecto es C:/programacion/massivamovilErp/massivamovilerp, reucerda leer tambien los .md dentro del proyecto 3. Para saber sobre los requerimientos completos del proyecto expresados en un Documento de Requisitos de Producto (PRD) lee el archivo: "PRD.md". 4. Para saber la planificación general proporcioonada lee el archivo PRD.md (general) y PLANNING.md (especifica derivada del archivo PRD.md), si no existe PLANNING.md obvia esta peticion. 5. Para saber el desgloce de tareas del proyeecto lee TASK.md y para saber el plan de desarrollo trasado por ti inteligencia artifical y valiidado por mi lee el archivo "resumen-planes-de-proyecto.md"  6. Luego de leer todos los documentoos en la primera sesion se ideo un plan de acciion que debes seguir en el archivo PLANNING.md,  este plan es el plan operativo inicial para sacar el proyecto, el plan geneal y completo esta en PRD.md, las tareas de la plaificación debes redactarlas en TASK.md y el PLAN de ejecución de desarrollo esta en resumen-planes-de-proyecto.md. Si PLANNING.md o PRD.md o resumen-planes-de-proyecto.md o TASK.md no existen no leas estos archivos. - Tambien Revisa tu historial de memooria y/o chat actual para que veas donde quedamos y sigamos adelante. - El archivo principal de las tareas que tu sigues es TASK.md y al terminiar una actualizas tambiien el global que esta README.md, si no existe TASK.md obvia esta peticion. Al archivo TASK.MD solo debe actualizarce lo nuevo, es decir que si tiene ya data verificar que se agrega nuevo, que se cambia de estatus, pero lo que ya esta realizazo se queda en la zoona de historial realizado y lo que esta por hacer tambien salvo que cambie de estatus. Actúa como un experto en Vercel. Usa las definiciones de herramientas que están en massivamovilerp/.agents/skills/vercel-react-best-practices para adaptar mi código actual de Next.js.


## Quick start

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | `prisma generate && next build` |
| `npm test` | `cross-env NODE_OPTIONS="--experimental-fetch" jest --forceExit` |
| `npm run lint` | ESLint |
| `dotenv -e .env -- ts-node --transpile-only scripts/<name>.ts` | Run any seed/utility script |

Scripts that need env vars use `dotenv -e .env`. Most scripts use `ts-node --transpile-only`.

## Architecture

- **Framework**: Next.js 16 App Router + React 19 + TypeScript 5
- **Auth**: NextAuth v5 (beta.30), Credentials provider, JWT strategy, Prisma adapter
  - Edge-compatible config: `auth.config.ts` (root)
  - Node config with providers: `src/lib/auth.ts`
  - **No middleware file** — auth checked server-side in pages or client-side via `useSession()`
- **DB**: PostgreSQL (Supabase) via Prisma 7 + `@prisma/adapter-pg` (PgBouncer pool)
  - Schema: `prisma/schema.prisma`
  - Build requires `prisma generate` (runs automatically via `postinstall`)
  - `prisma.config.ts` uses `defineConfig` pattern
- **Styling**: Tailwind CSS v4 + shadcn/ui (new-york style) + lucide-react
- **State**: Zustand, React Hook Form, Zod
- **PDF**: `@react-pdf/renderer` (InvoicePDF, CustomerDetailsPDF, LeadPdfTemplate)
- **Path alias**: `@/*` → `./src/*`

## Testing quirks

Jest 30 with **two projects** in `jest.config.js`:

| Project | Env | Matches |
|---|---|---|
| frontend | jsdom | `src/components/**/*.test.ts?(x)`, `src/app/!(api)/**/__tests__/*`, `src/lib/**/*.test.ts?(x)` |
| backend | node | `src/app/api/**/*.test.ts`, `src/proxy.test.ts` |

- Frontend uses `babel-jest`, backend uses `ts-jest`
- `jest.setup.js` polyfills `TextEncoder`/`TextDecoder`, mocks `ResizeObserver`, `PointerEvent`, `scrollIntoView`
- `transformIgnorePatterns` allows `next-auth`, `@auth/core`, `jose`, `msw`, etc. from `node_modules`
- CSS imports mapped to `identity-obj-proxy`

## RBAC

Three user roles: `MASSIVA_ADMIN`, `MASSIVA_EXTRA`, `CLIENTE`.

- `MASSIVA_EXTRA` users have a FK to the `Role` table via `User.roles_id` — resolved in JWT callback to a `roleDisplayName`
- Module-level access via `ModuloToRole` join table
- RBAC map in `src/lib/rbac.ts`

## Code organization

```
src/
  app/          — App Router pages & API routes
  components/   — Feature-based grouping (customers/, products/, facturacion/, leads/, cobranzas/)
    ui/         — shadcn/ui primitives (~22 files, Radix + Tailwind)
  lib/          — Business logic, auth, DB client, external API clients
  stores/       — Zustand stores (sidebar, auth)
  types/        — next-auth.d.ts augmentations
  roles/        — Role-based module configuration
scripts/        — 33+ ad-hoc scripts for seeding, data fixes, testing APIs
```

## Database models

Core: `User`, `Customer`, `Product`, `PriceList`, `ProductPrice`, `Invoice`, `InvoiceItem`, `Payment`, `Lead`, `Category`, `Role`, `Modulo`, `ModuloToRole`, `Parametro`, `TasaBcv`, plus NextAuth adapter tables.

Notable: `Customer.servicios_contratados` is a `Json` field (arrays of `[priceListId, productId, isManual, customName]`). `Invoice` uses dual-currency (USD/BS).

## External integrations

- **Email**: Custom REST API at `devapimail.bigmovil.com/sendMail` (axios, self-signed cert)
- **SMS**: `sistema.massivamovil.com/webservices/SendSms`
- **WhatsApp**: `whatsapp.massivamovil.com/api/send/whatsapp`
- **BCV rate**: Daily cron at `/api/cron/bcv` (00:00 UTC), `/api/cron/update-active-rate` (04:00 UTC)

## Vercel

- Cron jobs in `vercel.json` (2 schedules)
- `.env.local` contains `VERCEL_OIDC_TOKEN` for deployments

## DB client

PrismaClient is cached in `globalThis` in `src/lib/db.ts` for hot-reload safety.

## Next config quirks

`next.config.ts` has `experimental.optimizePackageImports` for `lucide-react`, `@radix-ui/*` — prefer barrel imports for these packages.
