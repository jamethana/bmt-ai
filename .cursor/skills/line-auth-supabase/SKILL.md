---
name: line-auth-supabase
description: Line OAuth + Supabase custom auth integration patterns for this app. Use when implementing auth flows, debugging login issues, working on /api/auth/ routes, or handling Line LIFF/Login redirects and session management.
---

# Line Auth + Supabase

## Flow overview

This app uses **Line Login** (not LIFF) with a custom OAuth exchange — not `supabase.auth.signInWithOAuth()`.

```
1. User → "Login with Line" button
2. Client → redirect to Line authorization URL
   - params: client_id, redirect_uri, state (random), code_challenge (PKCE)
3. Line → redirect to NEXT_PUBLIC_LINE_CALLBACK_URL with ?code=&state=
4. /api/auth/callback → validate state, exchange code for Line access token
5. /api/auth/callback → call Line profile API to get userId, displayName, pictureUrl
6. /api/auth/callback → upsert Supabase user, create Supabase session
7. Redirect to app (/ or returnTo param)
```

## Environment variables

| Variable | Where set | Purpose |
|---|---|---|
| `NEXT_PUBLIC_LINE_CHANNEL_ID` | `.env.local` + Vercel | Line Login channel ID |
| `LINE_CHANNEL_SECRET` | `.env.local` + Vercel | Server-only; never expose to client |
| `NEXT_PUBLIC_LINE_CALLBACK_URL` | `.env.local` + Vercel | Must match Line Developer Console exactly |
| `TEST_MODE_AUTH_BYPASS` | `.env.local` only | `true` skips auth for local dev |

## Common failure modes

**State mismatch**
- Cause: Cookie not persisted between redirect and callback (e.g. SameSite=Strict on cross-origin)
- Fix: Use `SameSite=Lax` and `Secure` for the `oauth_state` cookie

**Code expired (10-minute window)**
- Cause: Long delay between Line redirect and callback processing
- Fix: Check for `invalid_grant` error in token exchange response; redirect to `/auth/error?reason=code_expired`

**Redirect URI mismatch**
- Cause: `NEXT_PUBLIC_LINE_CALLBACK_URL` doesn't exactly match what's in Line Developer Console
- Fix: Check trailing slashes, HTTP vs HTTPS, `localhost` vs `127.0.0.1`; they must be identical strings

**Session null after login**
- Cause: Supabase session cookie not set because response was a redirect (Next.js quirk)
- Fix: Set auth cookies before redirecting; use `supabase.auth.setSession()` then `response.cookies.set()`

**PKCE flow confusion**
- This app uses PKCE. The `code_verifier` must be stored in a cookie at step 2 and sent at step 4.
- Never use implicit flow (no `response_type=token`).

## Local dev bypass

`TEST_MODE_AUTH_BYPASS=true` in `.env.local` injects a test user without going through Line:

```ts
if (process.env.TEST_MODE_AUTH_BYPASS === "true" && process.env.NODE_ENV !== "production") {
  // Return mock session with a fixed test userId
  return mockSession;
}
```

Never set this in production. Verify by checking `NODE_ENV !== "production"` as a second guard.

## Debugging checklist

1. Check `/api/auth/callback` request in browser DevTools Network tab — look for `error` param in URL
2. Verify `NEXT_PUBLIC_LINE_CALLBACK_URL` matches Line Developer Console redirect URI exactly
3. Check Supabase Auth logs (Supabase MCP → auth logs) for token exchange errors
4. Confirm `oauth_state` cookie is set before the redirect and available on callback
5. Confirm `code_verifier` cookie is set before the redirect and available on callback
