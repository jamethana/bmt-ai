import { describe, it, expect } from "vitest";
import { canAssignCourt, canRecordOwnResult, canRecordAnyResult } from "@/src/domain/policies/permissions";

const baseSession = {
  allowPlayerAssignEmptyCourt: false,
  allowPlayerRecordOwnResult: false,
  allowPlayerRecordAnyResult: false,
};

describe("canAssignCourt", () => {
  it("allows moderator regardless of flags", () => {
    expect(canAssignCourt({ isModerator: true, session: baseSession })).toBe(true);
  });
  it("allows player when flag is on", () => {
    expect(canAssignCourt({ isModerator: false, session: { ...baseSession, allowPlayerAssignEmptyCourt: true } })).toBe(true);
  });
  it("denies player when flag is off", () => {
    expect(canAssignCourt({ isModerator: false, session: baseSession })).toBe(false);
  });
});

describe("canRecordOwnResult", () => {
  const pairing = { teamAPlayer1: "u1", teamAPlayer2: "u2", teamBPlayer1: "u3", teamBPlayer2: "u4" };
  it("allows moderator", () => {
    expect(canRecordOwnResult({ isModerator: true, session: baseSession, pairing, userId: "anyone" })).toBe(true);
  });
  it("allows player in pairing when own-result flag on", () => {
    expect(canRecordOwnResult({ isModerator: false, session: { ...baseSession, allowPlayerRecordOwnResult: true }, pairing, userId: "u1" })).toBe(true);
  });
  it("denies player not in pairing", () => {
    expect(canRecordOwnResult({ isModerator: false, session: { ...baseSession, allowPlayerRecordOwnResult: true }, pairing, userId: "u99" })).toBe(false);
  });
  it("allows player in pairing when any-result flag on", () => {
    expect(canRecordOwnResult({ isModerator: false, session: { ...baseSession, allowPlayerRecordAnyResult: true }, pairing, userId: "u2" })).toBe(true);
  });
});

describe("canRecordAnyResult", () => {
  it("allows moderator", () => {
    expect(canRecordAnyResult({ isModerator: true, session: baseSession })).toBe(true);
  });
  it("allows player when flag on", () => {
    expect(canRecordAnyResult({ isModerator: false, session: { ...baseSession, allowPlayerRecordAnyResult: true } })).toBe(true);
  });
  it("denies player when flag off", () => {
    expect(canRecordAnyResult({ isModerator: false, session: baseSession })).toBe(false);
  });
});
