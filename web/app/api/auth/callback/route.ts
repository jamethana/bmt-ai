import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/src/infrastructure/db/supabase-admin";
import { createSessionToken, COOKIE_NAME, MAX_AGE } from "@/src/infrastructure/auth/session";
import { generateRequestId } from "@/src/lib/request-id";
import { apiError } from "@/src/lib/api-response";
import { logger } from "@/src/infrastructure/logging/logger";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  // Test mode bypass
  if (process.env.TEST_MODE_AUTH_BYPASS === "true" && !code) {
    const testUserId = url.searchParams.get("test_user_id");
    if (testUserId) {
      const supabase = createAdminClient();
      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("id", testUserId)
        .single();
      if (user) {
        const token = await createSessionToken({
          userId: user.id,
          lineUserId: user.line_user_id ?? "",
          displayName: user.display_name,
          isModerator: user.is_moderator,
        });
        const cookieStore = await cookies();
        cookieStore.set(COOKIE_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: MAX_AGE,
          path: "/",
        });
        return Response.redirect(new URL("/", req.url));
      }
    }
  }

  if (!code) {
    return apiError("VALIDATION_ERROR", "Missing code parameter", requestId, 400);
  }

  try {
    // Exchange code for Line access token
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.NEXT_PUBLIC_LINE_CALLBACK_URL!,
        client_id: process.env.LINE_CHANNEL_ID!,
        client_secret: process.env.LINE_CHANNEL_SECRET!,
      }),
    });

    if (!tokenRes.ok) {
      logger.error("Line token exchange failed", { requestId, status: tokenRes.status });
      return apiError("DEPENDENCY_ERROR", "Line auth failed", requestId, 502);
    }

    const { access_token } = await tokenRes.json();

    // Get Line profile
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileRes.ok) {
      return apiError("DEPENDENCY_ERROR", "Failed to get Line profile", requestId, 502);
    }

    const profile = await profileRes.json();
    const lineUserId = String(profile.userId ?? "").trim();
    const displayName = String(profile.displayName ?? "Line User").trim() || "Line User";
    const pictureUrl = profile.pictureUrl as string | undefined;

    if (!lineUserId) {
      logger.error("Line profile missing userId", { requestId });
      return apiError("DEPENDENCY_ERROR", "Invalid Line profile", requestId, 502);
    }

    // Upsert user in DB (service_role key + GRANT on public.users required)
    const supabase = createAdminClient();
    const { data: user, error: upsertError } = await supabase
      .from("users")
      .upsert(
        { line_user_id: lineUserId, display_name: displayName, picture_url: pictureUrl ?? null },
        { onConflict: "line_user_id" }
      )
      .select("*")
      .single();

    if (upsertError || !user) {
      const dbMessage = upsertError?.message ?? "No rows returned";
      const dbCode = upsertError?.code ?? "";
      logger.error("User upsert failed", {
        requestId,
        errorCode: "INTERNAL_ERROR",
        dbMessage,
        dbCode,
        hint: upsertError?.hint,
      });
      return apiError(
        "INTERNAL_ERROR",
        "Failed to create user",
        requestId,
        500,
        process.env.NODE_ENV === "development" ? { dbError: dbMessage, dbCode } : undefined
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      lineUserId: user.line_user_id ?? "",
      displayName: user.display_name,
      isModerator: user.is_moderator,
    });

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: MAX_AGE,
      path: "/",
    });

    logger.info("User authenticated via Line", { requestId, userId: user.id });
    return Response.redirect(new URL("/", req.url));
  } catch (err) {
    logger.error("Auth callback error", { requestId, err: String(err) });
    return apiError("INTERNAL_ERROR", "Authentication failed", requestId, 500);
  }
}
