// =====================================================================
// src/routes/v1/ingest.route.ts
// Ruta de ingesta separada con API key (X-Ingest-Key) para el worker de IA
// POST /v1/ingest
// POST /v1/ingest/bulk
// =====================================================================

import { Hono } from "hono";

import { requireIngestKey } from "../../middlewares/auth.js";
import { ingestSingle, ingestBulk } from "../../controllers/admin/ingest.admin.controller.js";

export const ingestRoute = new Hono();

ingestRoute.use("*", requireIngestKey);

ingestRoute.post("/", ingestSingle);
ingestRoute.post("/bulk", ingestBulk);
