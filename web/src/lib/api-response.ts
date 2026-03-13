import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR"
  | "DEPENDENCY_ERROR"
  | "RATE_LIMITED";

export function apiSuccess<T>(data: T, requestId: string, status = 200) {
  return NextResponse.json({ data, requestId }, { status });
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  requestId: string,
  status: number,
  details?: object
) {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) }, requestId },
    { status }
  );
}
