// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createSessionToken, verifySessionToken } from "@/src/infrastructure/auth/session";

describe("session tokens", () => {
  const payload = {
    userId: "user-1",
    lineUserId: "line-1",
    displayName: "Alice",
    isModerator: false,
  };

  it("creates and verifies a valid token", async () => {
    const token = await createSessionToken(payload);
    const verified = await verifySessionToken(token);
    expect(verified?.userId).toBe("user-1");
    expect(verified?.displayName).toBe("Alice");
  });

  it("returns null for invalid token", async () => {
    const result = await verifySessionToken("invalid.token.here");
    expect(result).toBeNull();
  });
});
