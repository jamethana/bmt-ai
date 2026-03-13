import { NextRequest } from "next/server";
import { requireAuth, requireModerator } from "@/src/infrastructure/auth/require-auth";
import { createAdminClient } from "@/src/infrastructure/db/supabase-admin";
import { apiSuccess, apiError } from "@/src/lib/api-response";
import { generateRequestId } from "@/src/lib/request-id";
import { z } from "zod";

const PatchPairingSchema = z.object({
  status: z.enum(["in_progress", "completed", "voided"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ pairingId: string }> }
) {
  const requestId = generateRequestId();
  const { session, isModerator } = await requireModerator();
  if (!session) return apiError("UNAUTHORIZED", "Not authenticated", requestId, 401);
  if (!isModerator) return apiError("FORBIDDEN", "Moderators only", requestId, 403);

  const { pairingId } = await params;
  const body = await req.json();
  const parsed = PatchPairingSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid input", requestId, 400, { issues: parsed.error.issues });
  }

  const supabase = createAdminClient();
  const updates: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === "completed") {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("pairings")
    .update(updates)
    .eq("id", pairingId)
    .select("*")
    .single();

  if (error || !data) return apiError("NOT_FOUND", "Pairing not found", requestId, 404);
  return apiSuccess(data, requestId);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pairingId: string }> }
) {
  const requestId = generateRequestId();
  const session = await requireAuth();
  if (!session) return apiError("UNAUTHORIZED", "Not authenticated", requestId, 401);

  const { pairingId } = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pairings")
    .select("*, result:game_results(*)")
    .eq("id", pairingId)
    .single();

  if (error || !data) return apiError("NOT_FOUND", "Pairing not found", requestId, 404);
  return apiSuccess(data, requestId);
}
