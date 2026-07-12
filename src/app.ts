// =====================================================================
// src/app.ts
// Punto de arranque. Lee env ya cargado (via --env-file), monta rutas,
// aplica middlewares globales y levanta el server de Node.
// =====================================================================

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { healthRoute } from "./routes/health.route.js";
import { publicRoute } from "./routes/v1/public.route.js";
import { adminRoute } from "./routes/v1/admin.route.js";
import { ingestRoute } from "./routes/v1/ingest.route.js";

const app = new Hono();

// ---- Middlewares globales ----
app.use("*", logger());
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: env.corsOrigins.length > 0 ? env.corsOrigins : "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

// ---- Rutas ----
app.route("/health", healthRoute);
app.route("/v1", publicRoute);
app.route("/v1/admin", adminRoute);
app.route("/v1/ingest", ingestRoute);

app.notFound((c) => c.json({ success: false, error: "Ruta no encontrada" }, 404));
app.onError(errorHandler);

serve(
  {
    fetch: app.fetch,
    port: env.port,
  },
  (info) => {
    console.info(`[app] Servidor corriendo en http://localhost:${info.port} (${env.nodeEnv})`);
  },
);
