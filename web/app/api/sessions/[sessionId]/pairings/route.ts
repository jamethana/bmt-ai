import { NextRequest } from "next/server";
import { requireModerator } from "@/src/infrastructure/auth/require-auth";
import { createAdminClient } from "@/src/infrastructure/db/supabase-admin";
import { apiSuccess, apiError } from "@/src/lib/api-response";
import { generateRequestId } from "@/src/lib/request-id";
import { generatePairing, PlayerStats, PairingRule } from "@/src/domain/algorithms/pairing";
import { logger } from "@/src/infrastructure/logging/logger";
import { z } from "zod";

const CreatePairingSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("auto"),
    courtNumber: z.number().int().min(1),
  }),
  z.object({
    mode: z.literal("manual"),
    courtNumber: z.number().int().min(1),
    teamAPlayer1: z.string().uuid(),
    teamAPlayer2: z.string().uuid(),
    teamBPlayer1: z.string().uuid(),
    teamBPlayer2: z.string().uuid(),
  }),
]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const requestId = generateRequestId();
  const session = await requireAuth();
  if (!session) return apiError("UNAUTHORIZED", "Not authenticated", requestId, 401);

  const { sessionId } = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pairings")
    .select("*, result:game_results(*)")
    .eq("session_id", sessionId)
    .order("court_number", { ascending: true })
    .order("sequence_number", { ascending: true });

  if (error) return apiError("INTERNAL_ERROR", error.message, requestId, 500);
  return apiSuccess(data, requestId);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const requestId = generateRequestId();
  const { session, isModerator } = await requireModerator();
  if (!session) return apiError("UNAUTHORIZED", "Not authenticated", requestId, 401);
  if (!isModerator) return apiError("FORBIDDEN", "Moderators only", requestId, 403);

  const { sessionId } = await params;
  const body = await req.json();
  const parsed = CreatePairingSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid input", requestId, 400, { issues: parsed.error.issues });
  }

  const supabase = createAdminClient();

  // Fetch session for pairing config
  const { data: sess } = await supabase
    .from("sessions")
    .select("id, pairing_rule, max_partner_skill_level_gap, status")
    .eq("id", sessionId)
    .single();

  if (!sess) return apiError("NOT_FOUND", "Session not found", requestId, 404);
  if (sess.status !== "active") {
    return apiError("CONFLICT", "Session must be active to create pairings", requestId, 409);
  }

  const d = parsed.data;

  // Get sequence number for this court
  const { data: existingPairings } = await supabase
    .from("pairings")
    .select("sequence_number")
    .eq("session_id", sessionId)
    .eq("court_number", d.courtNumber)
    .order("sequence_number", { ascending: false })
    .limit(1);

  const sequenceNumber = (existingPairings?.[0]?.sequence_number ?? 0) + 1;

  let pairingData: Record<string, unknown>;

  if (d.mode === "manual") {
    pairingData = {
      session_id: sessionId,
      court_number: d.courtNumber,
      sequence_number: sequenceNumber,
      status: "scheduled",
      team_a_player1: d.teamAPlayer1,
      team_a_player2: d.teamAPlayer2,
      team_b_player1: d.teamBPlayer1,
      team_b_player2: d.teamBPlayer2,
    };
  } else {
    // Auto mode: fetch active players not in an in_progress pairing
    const { data: sessionPlayers } = await supabase
      .from("session_players")
      .select("user_id, user:users(id, skill_level, calculated_skill_rating, trueskill_mu)")
      .eq("session_id", sessionId)
      .eq("is_active", true);

    if (!sessionPlayers || sessionPlayers.length < 4) {
      return apiError("CONFLICT", "Not enough active players for auto-pairing (need 4+)", requestId, 409);
    }

    // Find players currently in in_progress pairings
    const { data: activePairings } = await supabase
      .from("pairings")
      .select("team_a_player1, team_a_player2, team_b_player1, team_b_player2")
      .eq("session_id", sessionId)
      .eq("status", "in_progress");

    const busyPlayerIds = new Set<string>();
    for (const p of activePairings ?? []) {
      [p.team_a_player1, p.team_a_player2, p.team_b_player1, p.team_b_player2]
        .filter(Boolean)
        .forEach(id => busyPlayerIds.add(id as string));
    }

    // Build player stats from completed pairings
    const { data: completedPairings } = await supabase
      .from("pairings")
      .select("team_a_player1, team_a_player2, team_b_player1, team_b_player2, status, sequence_number")
      .eq("session_id", sessionId)
      .in("status", ["completed", "in_progress"]);

    const statsMap = new Map<string, PlayerStats>();

    for (const sp of sessionPlayers) {
      const u = sp.user as unknown as { id: string; skill_level: number; calculated_skill_rating: number | null; trueskill_mu: number | null } | null;
      if (!u) continue;
      statsMap.set(sp.user_id, {
        userId: sp.user_id,
        skillLevel: u.skill_level ?? 5,
        skillRating: u.calculated_skill_rating ?? u.trueskill_mu ?? 1000,
        matchesPlayed: 0,
        gamesSinceLastPlayed: 0,
        partnerHistory: {},
        opponentHistory: {},
      });
    }

    // Compute per-player stats from history
    const maxSeq = Math.max(...(completedPairings ?? []).map(p => p.sequence_number ?? 0), 0);
    for (const p of completedPairings ?? []) {
      const teamA = [p.team_a_player1, p.team_a_player2].filter(Boolean) as string[];
      const teamB = [p.team_b_player1, p.team_b_player2].filter(Boolean) as string[];

      for (const playerId of [...teamA, ...teamB]) {
        const stats = statsMap.get(playerId);
        if (!stats) continue;
        stats.matchesPlayed++;
        stats.gamesSinceLastPlayed = maxSeq - (p.sequence_number ?? 0);
      }

      // Record partner/opponent history
      for (const [a, b] of [[...teamA], [...teamB]]) {
        if (a && b) {
          const sa = statsMap.get(a);
          const sb = statsMap.get(b);
          if (sa) sa.partnerHistory[b] = (sa.partnerHistory[b] ?? 0) + 1;
          if (sb) sb.opponentHistory[a] = (sb.opponentHistory[a] ?? 0) + 1;
        }
      }
      for (const a of teamA) {
        for (const b of teamB) {
          const sa = statsMap.get(a);
          const sb = statsMap.get(b);
          if (sa) sa.opponentHistory[b] = (sa.opponentHistory[b] ?? 0) + 1;
          if (sb) sb.opponentHistory[a] = (sb.opponentHistory[a] ?? 0) + 1;
        }
      }
    }

    const availablePlayers = Array.from(statsMap.values()).filter(p => !busyPlayerIds.has(p.userId));

    if (availablePlayers.length < 4) {
      return apiError("CONFLICT", "Not enough available players (others are playing)", requestId, 409);
    }

    const result = generatePairing(
      availablePlayers,
      (sess.pairing_rule as PairingRule) ?? "balanced",
      sess.max_partner_skill_level_gap ?? 10
    );

    if (!result) {
      return apiError("CONFLICT", "Could not generate a valid pairing", requestId, 409);
    }

    pairingData = {
      session_id: sessionId,
      court_number: d.courtNumber,
      sequence_number: sequenceNumber,
      status: "scheduled",
      team_a_player1: result.teamA[0].userId,
      team_a_player2: result.teamA[1].userId,
      team_b_player1: result.teamB[0].userId,
      team_b_player2: result.teamB[1].userId,
    };

    logger.info("Auto-pairing generated", { requestId, sessionId, score: result.score });
  }

  const { data, error } = await supabase
    .from("pairings")
    .insert(pairingData)
    .select("*")
    .single();

  if (error) return apiError("INTERNAL_ERROR", error.message, requestId, 500);
  return apiSuccess(data, requestId, 201);
}
