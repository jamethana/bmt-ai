import { NextRequest } from "next/server";
import { requireAuth, requireModerator } from "@/src/infrastructure/auth/require-auth";
import { createAdminClient } from "@/src/infrastructure/db/supabase-admin";
import { apiSuccess, apiError } from "@/src/lib/api-response";
import { generateRequestId } from "@/src/lib/request-id";
import { z } from "zod";

const PatchSessionSchema = z.object({
  status: z.enum(["draft", "active", "completed", "cancelled"]).optional(),
  name: z.string().min(1).max(100).optional(),
  notes: z.string().optional(),
  numCourts: z.number().int().min(1).max(20).optional(),
  courtNames: z.record(z.string(), z.string()).optional(),
  pairingRule: z.enum(["least_played", "longest_wait", "balanced"]).optional(),
  maxPartnerSkillLevelGap: z.number().int().min(1).max(10).optional(),
  allowPlayerAssignEmptyCourt: z.boolean().optional(),
  allowPlayerRecordOwnResult: z.boolean().optional(),
  allowPlayerRecordAnyResult: z.boolean().optional(),
  allowPlayerAddRemoveCourts: z.boolean().optional(),
  allowPlayerAccessInviteQr: z.boolean().optional(),
  showSkillLevelPills: z.boolean().optional(),
});

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
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error || !data) return apiError("NOT_FOUND", "Session not found", requestId, 404);
  return apiSuccess(data, requestId);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const requestId = generateRequestId();
  const { session, isModerator } = await requireModerator();
  if (!session) return apiError("UNAUTHORIZED", "Not authenticated", requestId, 401);
  if (!isModerator) return apiError("FORBIDDEN", "Moderators only", requestId, 403);

  const { sessionId } = await params;
  const body = await req.json();
  const parsed = PatchSessionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid input", requestId, 400, { issues: parsed.error.issues });
  }

  const d = parsed.data;
  const updates: Record<string, unknown> = {};
  if (d.status !== undefined) updates.status = d.status;
  if (d.name !== undefined) updates.name = d.name;
  if (d.notes !== undefined) updates.notes = d.notes;
  if (d.numCourts !== undefined) updates.num_courts = d.numCourts;
  if (d.courtNames !== undefined) updates.court_names = d.courtNames;
  if (d.pairingRule !== undefined) updates.pairing_rule = d.pairingRule;
  if (d.maxPartnerSkillLevelGap !== undefined) updates.max_partner_skill_level_gap = d.maxPartnerSkillLevelGap;
  if (d.allowPlayerAssignEmptyCourt !== undefined) updates.allow_player_assign_empty_court = d.allowPlayerAssignEmptyCourt;
  if (d.allowPlayerRecordOwnResult !== undefined) updates.allow_player_record_own_result = d.allowPlayerRecordOwnResult;
  if (d.allowPlayerRecordAnyResult !== undefined) updates.allow_player_record_any_result = d.allowPlayerRecordAnyResult;
  if (d.allowPlayerAddRemoveCourts !== undefined) updates.allow_player_add_remove_courts = d.allowPlayerAddRemoveCourts;
  if (d.allowPlayerAccessInviteQr !== undefined) updates.allow_player_access_invite_qr = d.allowPlayerAccessInviteQr;
  if (d.showSkillLevelPills !== undefined) updates.show_skill_level_pills = d.showSkillLevelPills;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error || !data) return apiError("NOT_FOUND", "Session not found", requestId, 404);
  return apiSuccess(data, requestId);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const requestId = generateRequestId();
  const { session, isModerator } = await requireModerator();
  if (!session) return apiError("UNAUTHORIZED", "Not authenticated", requestId, 401);
  if (!isModerator) return apiError("FORBIDDEN", "Moderators only", requestId, 403);

  const { sessionId } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId);

  if (error) return apiError("INTERNAL_ERROR", error.message, requestId, 500);
  return apiSuccess({ deleted: true }, requestId);
}
