import { cookies } from "next/headers";
import { createAdminClient } from "@/src/infrastructure/db/supabase-admin";
import { verifySessionToken, COOKIE_NAME, SessionPayload } from "./session";

export async function requireAuth(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Current is_moderator from DB so role changes apply without re-login. */
export async function getIsModeratorFromDb(session: SessionPayload): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("is_moderator")
    .eq("id", session.userId)
    .single();
  return data?.is_moderator === true;
}

/** Auth + moderator check using DB so new moderators work without re-login. */
export async function requireModerator(): Promise<{
  session: SessionPayload | null;
  isModerator: boolean;
}> {
  const session = await requireAuth();
  if (!session) return { session: null, isModerator: false };
  const isModerator = await getIsModeratorFromDb(session);
  return { session, isModerator };
}
