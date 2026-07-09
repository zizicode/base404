// =====================================================================
// src/routes/health.route.ts
// =====================================================================

import { Hono } from "hono";

import { env } from "../config/env.js";

export const healthRoute = new Hono().get("/", (c) => {
  return c.json({
    success: true,
    status: "ok",
    env: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});
