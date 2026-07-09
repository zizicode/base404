// =====================================================================
// src/middlewares/error-handler.ts
// =====================================================================

import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";

import { env } from "../config/env.js";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        error: err.message,
      },
      err.status,
    );
  }

  console.error("[unhandled_error]", err);

  return c.json(
    {
      success: false,
      error: env.isProduction ? "Internal Server Error" : err.message,
    },
    500,
  );
};
