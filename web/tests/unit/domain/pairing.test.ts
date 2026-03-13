import { describe, it, expect } from "vitest";
import { generatePairing, RULE_WEIGHTS, type PlayerStats } from "@/src/domain/algorithms/pairing";

function makePlayer(id: string, overrides: Partial<PlayerStats> = {}): PlayerStats {
  return {
    userId: id,
    skillLevel: 5,
    skillRating: 1000,
    matchesPlayed: 0,
    gamesSinceLastPlayed: 0,
    partnerHistory: {},
    opponentHistory: {},
    ...overrides,
  };
}

describe("generatePairing — basics", () => {
  it("returns null when fewer than 4 players available", () => {
    const result = generatePairing([makePlayer("1"), makePlayer("2"), makePlayer("3")]);
    expect(result).toBeNull();
  });

  it("returns a valid 4-player assignment with 2 teams of 2", () => {
    const players = [makePlayer("1"), makePlayer("2"), makePlayer("3"), makePlayer("4")];
    const result = generatePairing(players);
    expect(result).not.toBeNull();
    expect(result!.teamA).toHaveLength(2);
    expect(result!.teamB).toHaveLength(2);
    const allIds = [...result!.teamA, ...result!.teamB].map(p => p.userId);
    expect(new Set(allIds).size).toBe(4); // no duplicates
  });

  it("always assigns 4 distinct players even from a large pool", () => {
    const players = Array.from({ length: 16 }, (_, i) => makePlayer(String(i)));
    const result = generatePairing(players);
    expect(result).not.toBeNull();
    const allIds = [...result!.teamA, ...result!.teamB].map(p => p.userId);
    expect(new Set(allIds).size).toBe(4);
  });
});

describe("generatePairing — wait time fairness", () => {
  it("includes the longest-waiting player even when they're not the best skill match", () => {
    // p5 has been waiting 8 rounds — they must be in the game despite a slightly different rating.
    const players = [
      makePlayer("p1", { skillRating: 1000, gamesSinceLastPlayed: 1 }),
      makePlayer("p2", { skillRating: 1000, gamesSinceLastPlayed: 1 }),
      makePlayer("p3", { skillRating: 1000, gamesSinceLastPlayed: 1 }),
      makePlayer("p4", { skillRating: 1000, gamesSinceLastPlayed: 1 }),
      makePlayer("p5", { skillRating: 900,  gamesSinceLastPlayed: 8 }), // must play
    ];
    const result = generatePairing(players, "longest_wait");
    expect(result).not.toBeNull();
    const selectedIds = [...result!.teamA, ...result!.teamB].map(p => p.userId);
    expect(selectedIds).toContain("p5");
  });

  it("includes the player with fewest matches under least_played rule", () => {
    const players = [
      makePlayer("v1", { matchesPlayed: 10 }),
      makePlayer("v2", { matchesPlayed: 10 }),
      makePlayer("v3", { matchesPlayed: 10 }),
      makePlayer("v4", { matchesPlayed: 10 }),
      makePlayer("newbie", { matchesPlayed: 1 }), // must be included
    ];
    const result = generatePairing(players, "least_played");
    expect(result).not.toBeNull();
    const selectedIds = [...result!.teamA, ...result!.teamB].map(p => p.userId);
    expect(selectedIds).toContain("newbie");
  });
});

describe("generatePairing — skill balance", () => {
  it("splits strong and weak players across teams (never stacks them)", () => {
    // Best: (strong+weak) vs (strong+weak) = 2000 vs 2000
    // Worst: (strong+strong) vs (weak+weak) = 3000 vs 1000
    const players = [
      makePlayer("s1", { skillRating: 1500 }),
      makePlayer("s2", { skillRating: 1500 }),
      makePlayer("w1", { skillRating: 500 }),
      makePlayer("w2", { skillRating: 500 }),
    ];
    const result = generatePairing(players, "balanced");
    expect(result).not.toBeNull();
    const teamASum = result!.teamA.reduce((s, p) => s + p.skillRating, 0);
    const teamBSum = result!.teamB.reduce((s, p) => s + p.skillRating, 0);
    expect(Math.abs(teamASum - teamBSum)).toBe(0);
  });

  it("skill_matched rule picks the most balanced teams even when others have been waiting longer", () => {
    const players = [
      makePlayer("a", { skillRating: 1500, gamesSinceLastPlayed: 0 }),
      makePlayer("b", { skillRating: 1500, gamesSinceLastPlayed: 5 }),
      makePlayer("c", { skillRating: 500,  gamesSinceLastPlayed: 0 }),
      makePlayer("d", { skillRating: 500,  gamesSinceLastPlayed: 5 }),
    ];
    const result = generatePairing(players, "skill_matched");
    expect(result).not.toBeNull();
    const teamASum = result!.teamA.reduce((s, p) => s + p.skillRating, 0);
    const teamBSum = result!.teamB.reduce((s, p) => s + p.skillRating, 0);
    expect(Math.abs(teamASum - teamBSum)).toBe(0);
  });
});

describe("generatePairing — variety", () => {
  it("avoids re-pairing the same partners when alternatives exist", () => {
    // p1 and p2 have partnered twice already — they should be on opposite teams
    const players = [
      makePlayer("p1", { partnerHistory: { p2: 2 } }),
      makePlayer("p2", { partnerHistory: { p1: 2 } }),
      makePlayer("p3", {}),
      makePlayer("p4", {}),
    ];
    const result = generatePairing(players);
    expect(result).not.toBeNull();
    const teamAIds = result!.teamA.map(p => p.userId);
    const p1InA = teamAIds.includes("p1");
    const p2InA = teamAIds.includes("p2");
    expect(p1InA).not.toBe(p2InA); // one on each team
  });
});

describe("generatePairing — maxPartnerSkillLevelGap", () => {
  it("respects the skill gap constraint when satisfiable", () => {
    const players = [
      makePlayer("a", { skillLevel: 3 }),
      makePlayer("b", { skillLevel: 5 }),
      makePlayer("c", { skillLevel: 4 }),
      makePlayer("d", { skillLevel: 6 }),
    ];
    const result = generatePairing(players, "balanced", 2);
    expect(result).not.toBeNull();
    for (const [pa, pb] of [result!.teamA, result!.teamB]) {
      expect(Math.abs(pa.skillLevel - pb.skillLevel)).toBeLessThanOrEqual(2);
    }
  });

  it("relaxes the constraint gracefully when impossible to satisfy", () => {
    // Only 4 players available, all pairs violate gap=1. Must not return null.
    const players = [
      makePlayer("a", { skillLevel: 1 }),
      makePlayer("b", { skillLevel: 5 }),
      makePlayer("c", { skillLevel: 1 }),
      makePlayer("d", { skillLevel: 5 }),
    ];
    expect(generatePairing(players, "balanced", 1)).not.toBeNull();
  });
});

describe("RULE_WEIGHTS", () => {
  it("every rule profile's weights sum to exactly 1.0", () => {
    for (const [, w] of Object.entries(RULE_WEIGHTS)) {
      expect(w.wait + w.fairness + w.balance + w.variety).toBeCloseTo(1.0, 5);
    }
  });
});
