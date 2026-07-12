// =====================================================================
// src/lib/response.ts
// Helpers de envelope { success, data, meta } / { success, error }
// =====================================================================

export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return { success: true as const, data, ...(meta ? { meta } : {}) };
}

export function fail(code: string, message: string) {
  return { success: false as const, error: { code, message } };
}
