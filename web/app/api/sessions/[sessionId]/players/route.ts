import { NextRequest } from "next/server";
import { requireAuth } from "@/src/infrastructure/auth/require-auth";
import { createAdminClient } from "@/src/infrastructure/db/supabase-admin";
import { apiSuccess, apiError } from "@/src/lib/api-response";
import { generateRequestId } from "@/src/lib/request-id";

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
    .from("session_players")
    .select("*, user:users(id, display_name, picture_url, skill_level, calculated_skill_rating, trueskill_mu, trueskill_sigma, is_moderator)")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) return apiError("INTERNAL_ERROR", error.message, requestId, 500);
  return apiSuccess(data, requestId);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const requestId = generateRequestId();
  const session = await requireAuth();
  if (!session) return apiError("UNAUTHORIZED", "Not authenticated", requestId, 401);

  const { sessionId } = await params;
  const supabase = createAdminClient();

  // Check session exists and is active/draft
  const { data: sess } = await supabase
    .from("sessions")
    .select("id, status, max_players")
    .eq("id", sessionId)
    .single();

  if (!sess) return apiError("NOT_FOUND", "Session not found", requestId, 404);
  if (sess.status === "completed" || sess.status === "cancelled") {
    return apiError("CONFLICT", "Session is not open for joining", requestId, 409);
  }

  // Check max players
  const { count } = await supabase
    .from("session_players")
    .select("id", { count: "exact" })
    .eq("session_id", sessionId)
    .eq("is_active", true);

  if ((count ?? 0) >= sess.max_players) {
    return apiError("CONFLICT", "Session is full", requestId, 409);
  }

  // Upsert: if player was previously marked inactive, reactivate
  const { data, error } = await supabase
    .from("session_players")
    .upsert(
      { session_id: sessionId, user_id: session.userId, is_active: true },
      { onConflict: "session_id,user_id" }
    )
    .select("*")
    .single();

  if (error || !data) return apiError("INTERNAL_ERROR", error?.message ?? "Failed to join", requestId, 500);
  return apiSuccess(data, requestId, 201);
}
