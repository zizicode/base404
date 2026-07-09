# error-codes-api

API en Hono + Node para la plataforma pSEO de códigos de error (ES/EN).

## Setup

```bash
pnpm install
cp .env.example .env.development   # completa SUPABASE_URL y las keys
pnpm dev
```

## Scripts

| Script | Qué hace |
|---|---|
| `pnpm dev` | Levanta el server con watch, usando `.env.development` |
| `pnpm start` | Levanta el server en modo producción, usando `.env.production` |
| `pnpm type-check` | Corre `tsc --noEmit` |
| `pnpm lint` / `pnpm lint:fix` | ESLint (flat config) |
| `pnpm release` | Bump de versión + type-check + lint |
| `pnpm generate:api` | Genera cliente tipado desde OpenAPI (orval) |

## Estructura

```
src/
  app.ts               # entry point
  config/env.ts         # validación de variables de entorno
  lib/supabase.ts        # cliente Supabase tipado (service role)
  middlewares/           # error handler, etc.
  routes/                # health, search, ... (agrega errors/ingest/admin)
  types/database.types.ts # tipos generados/mantenidos del esquema DB
```

## Notas

- `.env.development` y `.env.production` están en `.gitignore`. Usa
  `.env.example` como plantilla y nunca commitees keys reales.
- El backend usa `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS) porque las
  rutas de ingesta/admin necesitan escribir. Nunca expongas esa key al
  frontend.
