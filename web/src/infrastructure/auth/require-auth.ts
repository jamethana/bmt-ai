import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME, SessionPayload } from "./session";

export async function requireAuth(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
