import { NextRequest } from "next/server";
import { requireAuth, getIsModeratorFromDb } from "@/src/infrastructure/auth/require-auth";
import { createAdminClient } from "@/src/infrastructure/db/supabase-admin";
import { apiSuccess, apiError } from "@/src/lib/api-response";
import { generateRequestId } from "@/src/lib/request-id";
import { canRecordOwnResult, canRecordAnyResult } from "@/src/domain/policies/permissions";
import { z } from "zod";

const RecordResultSchema = z.object({
  teamAScore: z.number().int().min(0),
  teamBScore: z.number().int().min(0),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pairingId: string }> }
) {
  const requestId = generateRequestId();
  const session = await requireAuth();
  if (!session) return apiError("UNAUTHORIZED", "Not authenticated", requestId, 401);

  const isModerator = await getIsModeratorFromDb(session);

  const { pairingId } = await params;
  const supabase = createAdminClient();

  // Fetch pairing and session for permission check
  const { data: pairing } = await supabase
    .from("pairings")
    .select("*, session:sessions(allow_player_record_own_result, allow_player_record_any_result)")
    .eq("id", pairingId)
    .single();

  if (!pairing) return apiError("NOT_FOUND", "Pairing not found", requestId, 404);
  if (pairing.status !== "in_progress" && pairing.status !== "completed") {
    return apiError("CONFLICT", "Pairing must be in_progress or completed to record result", requestId, 409);
  }

  // Permission check
  const sess = pairing.session as { allow_player_record_own_result: boolean; allow_player_record_any_result: boolean };
  const sessionFlags = {
    allowPlayerAssignEmptyCourt: false,
    allowPlayerRecordOwnResult: sess.allow_player_record_own_result,
    allowPlayerRecordAnyResult: sess.allow_player_record_any_result,
  };
  const pairingPlayers = {
    teamAPlayer1: pairing.team_a_player1,
    teamAPlayer2: pairing.team_a_player2,
    teamBPlayer1: pairing.team_b_player1,
    teamBPlayer2: pairing.team_b_player2,
  };

  const canRecord =
    canRecordAnyResult({ isModerator, session: sessionFlags }) ||
    canRecordOwnResult({ isModerator, session: sessionFlags, pairing: pairingPlayers, userId: session.userId });

  if (!canRecord) {
    return apiError("FORBIDDEN", "Not allowed to record this result", requestId, 403);
  }

  const body = await req.json();
  const parsed = RecordResultSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid input", requestId, 400, { issues: parsed.error.issues });
  }

  const { teamAScore, teamBScore } = parsed.data;
  const winnerTeam = teamAScore >= teamBScore ? "teamA" : "teamB";

  // Check for existing result
  const { data: existing } = await supabase
    .from("game_results")
    .select("id")
    .eq("pairing_id", pairingId)
    .single();

  if (existing) {
    return apiError("CONFLICT", "Result already recorded for this pairing", requestId, 409);
  }

  const { data: result, error } = await supabase
    .from("game_results")
    .insert({
      pairing_id: pairingId,
      team_a_score: teamAScore,
      team_b_score: teamBScore,
      winner_team: winnerTeam,
      recorded_by: session.userId,
    })
    .select("*")
    .single();

  if (error || !result) return apiError("INTERNAL_ERROR", error?.message ?? "Failed to record result", requestId, 500);

  // Auto-complete the pairing if still in_progress
  if (pairing.status === "in_progress") {
    await supabase
      .from("pairings")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", pairingId);
  }

  return apiSuccess(result, requestId, 201);
}
