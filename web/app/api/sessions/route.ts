import { NextRequest } from "next/server";
import { requireAuth, requireModerator } from "@/src/infrastructure/auth/require-auth";
import { createAdminClient } from "@/src/infrastructure/db/supabase-admin";
import { apiSuccess, apiError } from "@/src/lib/api-response";
import { generateRequestId } from "@/src/lib/request-id";
import { z } from "zod";

const CreateSessionSchema = z.object({
  name: z.string().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  location: z.string().optional(),
  numCourts: z.number().int().min(1).max(20),
  maxPlayers: z.number().int().min(2).max(100),
  notes: z.string().optional(),
  courtNames: z.record(z.string(), z.string()).optional(),
  allowPlayerAssignEmptyCourt: z.boolean().optional(),
  allowPlayerRecordOwnResult: z.boolean().optional(),
  allowPlayerRecordAnyResult: z.boolean().optional(),
  allowPlayerAddRemoveCourts: z.boolean().optional(),
  allowPlayerAccessInviteQr: z.boolean().optional(),
  showSkillLevelPills: z.boolean().optional(),
  pairingRule: z.enum(["least_played", "longest_wait", "balanced"]).optional(),
  maxPartnerSkillLevelGap: z.number().int().min(1).max(10).optional(),
  status: z.enum(["draft", "active"]).optional(),
});

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await requireAuth();
  if (!session) return apiError("UNAUTHORIZED", "Not authenticated", requestId, 401);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .order("date", { ascending: false })
    .order("start_time", { ascending: false });

  if (error) return apiError("INTERNAL_ERROR", error.message, requestId, 500);
  return apiSuccess(data, requestId);
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const { session, isModerator } = await requireModerator();
  if (!session) return apiError("UNAUTHORIZED", "Not authenticated", requestId, 401);
  if (!isModerator) return apiError("FORBIDDEN", "Moderators only", requestId, 403);

  const body = await req.json();
  const parsed = CreateSessionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid input", requestId, 400, { issues: parsed.error.issues });
  }

  const d = parsed.data;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      name: d.name,
      date: d.date,
      start_time: d.startTime,
      end_time: d.endTime,
      location: d.location ?? null,
      num_courts: d.numCourts,
      max_players: d.maxPlayers,
      notes: d.notes ?? null,
      court_names: d.courtNames ?? {},
      status: d.status ?? "draft",
      created_by: session.userId,
      allow_player_assign_empty_court: d.allowPlayerAssignEmptyCourt ?? false,
      allow_player_record_own_result: d.allowPlayerRecordOwnResult ?? false,
      allow_player_record_any_result: d.allowPlayerRecordAnyResult ?? false,
      allow_player_add_remove_courts: d.allowPlayerAddRemoveCourts ?? false,
      allow_player_access_invite_qr: d.allowPlayerAccessInviteQr ?? false,
      show_skill_level_pills: d.showSkillLevelPills ?? true,
      pairing_rule: d.pairingRule ?? "least_played",
      max_partner_skill_level_gap: d.maxPartnerSkillLevelGap ?? 10,
    })
    .select("*")
    .single();

  if (error) return apiError("INTERNAL_ERROR", error.message, requestId, 500);
  return apiSuccess(data, requestId, 201);
}
