import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/src/infrastructure/auth/session";
import { NextRequest } from "next/server";

export async function POST(_req: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return Response.redirect(new URL("/", _req.url));
}
