# Comandos de Pruebas y Validación

## Comandos Base (NPM)
- **Todas las pruebas**: `npm test`
- **Pruebas en modo watch**: `npm test -- --watch`
- **Pruebas con cobertura**: `npm test -- --coverage`
- **Linting**: `npm run lint`
- **Fix Linting**: `npm run lint:fix`
- **Type Check**: `npx tsc --noEmit`

## Pruebas Específicas de Dominio
- **Clientes (CRM)**: `npm test src/components/customers/`
- **Autenticación**: `npm test src/app/api/auth/`
- **API Routes**: `npm test src/app/api/`

## Scripts de Verificación de Datos
- **Conexión DB**: `npx ts-node scripts/test-pg-connection.ts`
- **Seeding de prueba**: `npx ts-node scripts/seed-full-customers.ts`
- **Scraping BCV**: `npx ts-node scripts/live-test-bcv.ts`

## Flujo de Verificación E2E (Manual/Scripted)
1. Levantar DB local/Supabase.
2. Correr `npx prisma migrate reset` (con precaución).
3. Correr `npm test`.
4. Verificar logs de `/api/cron/bcv`.
