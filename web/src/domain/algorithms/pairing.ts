export interface PlayerStats {
  userId: string;
  skillLevel: number;   // 1–10 coarse (used for partner-gap hard filter)
  skillRating: number;  // continuous TrueSkill-derived value; higher = stronger
  matchesPlayed: number;        // total games played this session
  gamesSinceLastPlayed: number; // rounds idle since last game (0 = just came off court)
  partnerHistory: Record<string, number>;  // partnerId → times partnered this session
  opponentHistory: Record<string, number>; // opponentId → times faced this session
}

export interface PairingResult {
  teamA: [PlayerStats, PlayerStats];
  teamB: [PlayerStats, PlayerStats];
  score: number; // 0–1; higher is better
}

/**
 * Weight profiles for each pairing rule.
 * All four weights in a profile must sum to 1.0.
 *
 *  wait:     reward including players sitting out the longest
 *  fairness: reward including players with fewer total games (equity)
 *  balance:  reward closely matched team skill totals
 *  variety:  penalise repeated partners / opponents
 */
export const RULE_WEIGHTS = {
  least_played:  { wait: 0.10, fairness: 0.50, balance: 0.25, variety: 0.15 },
  longest_wait:  { wait: 0.50, fairness: 0.15, balance: 0.20, variety: 0.15 },
  balanced:      { wait: 0.25, fairness: 0.25, balance: 0.30, variety: 0.20 },
  skill_matched: { wait: 0.10, fairness: 0.10, balance: 0.60, variety: 0.20 },
} as const;

export type PairingRule = keyof typeof RULE_WEIGHTS;

interface ScoringContext {
  maxWait: number;          // highest gamesSinceLastPlayed in the candidate pool
  maxMatchesPlayed: number; // highest matchesPlayed in the candidate pool
  maxRatingSpread: number;  // (maxRating - minRating) × 2 — realistic max team-sum gap
}

/**
 * Scores a proposed 4-player assignment on a 0–1 scale.
 *
 * Every signal is independently normalised to [0, 1] before weighting,
 * so changing one player's rating won't collapse the scoring of other
 * signals (the old bug: raw rating diffs in the thousands dominated everything).
 */
function scorePairing(
  a1: PlayerStats, a2: PlayerStats,
  b1: PlayerStats, b2: PlayerStats,
  weights: (typeof RULE_WEIGHTS)[PairingRule],
  ctx: ScoringContext,
): number {
  const players = [a1, a2, b1, b2];

  // 1. WAIT SCORE [0–1]
  // Exponential amplification: someone idle 5 rounds is much more frustrated
  // than someone idle 1 round. Math.pow(x, 1.5) keeps score in [0,1] while
  // making long waits disproportionately attractive.
  const waitScore = ctx.maxWait > 0
    ? players.reduce((s, p) =>
        s + Math.pow(p.gamesSinceLastPlayed / ctx.maxWait, 1.5), 0) / 4
    : 0;

  // 2. FAIRNESS SCORE [0–1]
  // Reward picking players who have played less overall. Inverted: lower total = higher score.
  const fairnessScore = ctx.maxMatchesPlayed > 0
    ? 1 - players.reduce((s, p) => s + p.matchesPlayed, 0) / (4 * ctx.maxMatchesPlayed)
    : 1;

  // 3. BALANCE SCORE [0–1]
  // Reward teams whose combined ratings are as close as possible.
  const teamAStr = a1.skillRating + a2.skillRating;
  const teamBStr = b1.skillRating + b2.skillRating;
  const balanceScore = 1 - Math.min(1, Math.abs(teamAStr - teamBStr) / ctx.maxRatingSpread);

  // 4. VARIETY SCORE [0–1]
  // Penalise repeated partners (weight ×2 — same partner is more annoying than same opponent)
  // and repeated opponents (weight ×1). Uses counts so 3rd repeat hurts more than 2nd.
  const partnerPenalty =
    (a1.partnerHistory[a2.userId] ?? 0) * 2 +
    (b1.partnerHistory[b2.userId] ?? 0) * 2;
  const opponentPenalty =
    (a1.opponentHistory[b1.userId] ?? 0) + (a1.opponentHistory[b2.userId] ?? 0) +
    (a2.opponentHistory[b1.userId] ?? 0) + (a2.opponentHistory[b2.userId] ?? 0);
  // Normalise: 8 "repeat units" drives score to 0 (very repetitive session)
  const varietyScore = Math.max(0, 1 - (partnerPenalty + opponentPenalty) / 8);

  return (
    weights.wait     * waitScore    +
    weights.fairness * fairnessScore +
    weights.balance  * balanceScore  +
    weights.variety  * varietyScore
  );
}

/**
 * Finds the highest-scoring 4-player assignment from the available pool.
 *
 * Design notes:
 * - Full enumeration (no candidateLimit pre-filter): the pre-sort + hard-cut
 *   anti-pattern would prevent the scorer from ever seeing player #N who could
 *   produce a much better balanced game. For badminton sessions (≤30 players
 *   bench at once), C(30,4)=27,405 × 3 splits ≈ 80k score calls — well under 5ms.
 * - Three team splits per combination: (12v34), (13v24), (14v23). The old code
 *   only tried 2, missing valid balanced configurations.
 * - maxPartnerSkillLevelGap is a hard filter applied per team. If no combination
 *   satisfies it (too strict for the pool), we retry without the constraint rather
 *   than returning null and leaving courts empty.
 */
export function generatePairing(
  availablePlayers: PlayerStats[],
  rule: PairingRule = "balanced",
  maxPartnerSkillLevelGap = 10,
  _enforcing = true, // internal flag for constraint-relaxation fallback
): PairingResult | null {
  if (availablePlayers.length < 4) return null;

  const weights = RULE_WEIGHTS[rule];

  // Compute normalisation context from the full pool
  const maxWait = Math.max(...availablePlayers.map(p => p.gamesSinceLastPlayed), 1);
  const maxMatchesPlayed = Math.max(...availablePlayers.map(p => p.matchesPlayed), 1);
  const ratings = availablePlayers.map(p => p.skillRating);
  // Max realistic team-sum gap = full rating range × 2 (one team gets best+worst)
  const maxRatingSpread = Math.max((Math.max(...ratings) - Math.min(...ratings)) * 2, 1);

  const ctx: ScoringContext = { maxWait, maxMatchesPlayed, maxRatingSpread };
  let best: PairingResult | null = null;

  const n = availablePlayers.length;
  for (let i = 0; i < n - 3; i++) {
    for (let j = i + 1; j < n - 2; j++) {
      for (let k = j + 1; k < n - 1; k++) {
        for (let l = k + 1; l < n; l++) {
          const [p1, p2, p3, p4] = [
            availablePlayers[i], availablePlayers[j],
            availablePlayers[k], availablePlayers[l],
          ];
          // All 3 distinct team splits for 4 players
          const splits: [PlayerStats, PlayerStats, PlayerStats, PlayerStats][] = [
            [p1, p2, p3, p4], // (1,2) vs (3,4)
            [p1, p3, p2, p4], // (1,3) vs (2,4)
            [p1, p4, p2, p3], // (1,4) vs (2,3)
          ];
          for (const [a1, a2, b1, b2] of splits) {
            // Hard filter: enforce maxPartnerSkillLevelGap when still in enforcing mode
            if (_enforcing) {
              if (Math.abs(a1.skillLevel - a2.skillLevel) > maxPartnerSkillLevelGap) continue;
              if (Math.abs(b1.skillLevel - b2.skillLevel) > maxPartnerSkillLevelGap) continue;
            }
            const score = scorePairing(a1, a2, b1, b2, weights, ctx);
            if (!best || score > best.score) {
              best = { teamA: [a1, a2], teamB: [b1, b2], score };
            }
          }
        }
      }
    }
  }

  // If the skill-gap constraint made it impossible, retry without it
  // (empty courts are worse than a slightly mismatched pairing)
  if (!best && _enforcing) {
    return generatePairing(availablePlayers, rule, maxPartnerSkillLevelGap, false);
  }

  return best;
}
