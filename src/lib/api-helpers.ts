// Shared helpers for API route handlers.
// Provides consistent error responses and input validation utilities.

import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return error(err.errors.map((e) => e.message).join("; "), 400);
  }
  console.error(err);
  return error("Internal server error", 500);
}
