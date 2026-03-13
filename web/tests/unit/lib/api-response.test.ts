import { describe, it, expect } from "vitest";
import { apiSuccess, apiError } from "@/src/lib/api-response";

describe("apiSuccess", () => {
  it("returns JSON with data and requestId", async () => {
    const res = apiSuccess({ id: "1" }, "req-123");
    const body = await res.json();
    expect(body).toEqual({ data: { id: "1" }, requestId: "req-123" });
    expect(res.status).toBe(200);
  });
});

describe("apiError", () => {
  it("returns JSON with error shape", async () => {
    const res = apiError("NOT_FOUND", "Session not found", "req-123", 404);
    const body = await res.json();
    expect(body).toEqual({
      error: { code: "NOT_FOUND", message: "Session not found" },
      requestId: "req-123",
    });
    expect(res.status).toBe(404);
  });
});
