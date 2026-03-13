import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/src/infrastructure/auth/session";
import { createAdminClient } from "@/src/infrastructure/db/supabase-admin";
import { apiSuccess, apiError } from "@/src/lib/api-response";
import { generateRequestId } from "@/src/lib/request-id";

export async function GET(_req: NextRequest) {
  const requestId = generateRequestId();
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return apiError("UNAUTHORIZED", "Not authenticated", requestId, 401);
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return apiError("UNAUTHORIZED", "Invalid session", requestId, 401);
  }

  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, display_name, picture_url, is_moderator, skill_level, calculated_skill_rating, trueskill_mu")
    .eq("id", session.userId)
    .single();

  if (!user) {
    return apiError("NOT_FOUND", "User not found", requestId, 404);
  }

  return apiSuccess(user, requestId);
}
