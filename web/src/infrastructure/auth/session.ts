import { SignJWT, jwtVerify } from "jose";

const SECRET = Buffer.from(
  process.env.AUTH_SECRET ?? "dev-secret-change-in-prod"
);
const COOKIE_NAME = "bmt_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  userId: string;
  lineUserId: string;
  displayName: string;
  isModerator: boolean;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export { COOKIE_NAME, MAX_AGE };
