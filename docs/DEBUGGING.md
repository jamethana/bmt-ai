# Debugging Guide

## Standard Debug Workflow

1. **Reproduce** — Identify the failing action (route, button, form submit)
2. **Capture requestId** — Every API response includes `{ error: ..., requestId: "uuid" }`. Grab it.
3. **Filter logs** — In Vercel logs or local console, filter by `requestId`:
   ```
   grep '"requestId":"<uuid>"' logs.json
   ```
4. **Inspect DB** — Use Supabase MCP or the dashboard to check relevant rows
5. **Add/run tests** — Write a unit test that reproduces the scenario, fix, verify
6. **Minimal fix** — Target the specific failing function; avoid broad rewrites

## Request Tracing

Every API handler calls `generateRequestId()` on entry and passes it through:

```typescript
// In route handler:
const requestId = generateRequestId();
logger.info("Processing request", { requestId, route: "/api/sessions", userId: session.userId });
// ...
return apiError("NOT_FOUND", "Session not found", requestId, 404);
// or:
return apiSuccess(data, requestId);
```

The `requestId` appears in:
- The JSON response body
- All logger calls within that request
- Browser devtools Network panel

## Common Failure Modes

### Auth not working
- Check `bmt_session` cookie is set (httpOnly, so not visible in JS)
- Call `/api/auth/me` — if 401, session is missing or expired
- Re-login via Line OAuth
- Use `auth-debugger` subagent for systematic diagnosis

### "Failed to create user" on Line login (DB error 42501)
- **Symptom:** `/api/auth/callback` returns 500 with "Failed to create user". Logs show `dbMessage: "permission denied for table users"`, `dbCode: "42501"`.
- **Cause:** The app uses `SUPABASE_SERVICE_ROLE_KEY` to upsert into `public.users`. Postgres denies the write if (1) the env var is missing or set to the **anon** key in Vercel, or (2) the `service_role` database role has no GRANT on `public.users`.
- **Fix (env):** In Vercel → Project → Settings → Environment Variables, set `SUPABASE_SERVICE_ROLE_KEY` to the **service_role** secret from Supabase (Dashboard → Project Settings → API → "service_role" secret). Do not use the anon/public key. Redeploy after changing.
- **Fix (DB grants):** If the key is correct but 42501 persists, the table may lack grants for the Supabase `service_role` role. In Supabase → SQL Editor run the [full grants block](#grant-service_role-access-to-all-app-tables) below, then retry.

### Permission denied for table … (42501)
If you see "permission denied for table sessions", "permission denied for table users", or similar, the Supabase `service_role` role lacks GRANTs on that table. The API uses the service role key for all DB access.

**Grant service_role access to all app tables** — run once in Supabase → SQL Editor:
```sql
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_players TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pairings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_results TO service_role;
```
Then retry the failing action (login, sessions list, create session, etc.).

### Grant moderator status to a user
In Supabase → SQL Editor run (replace with the target user’s identifier):
```sql
-- By display name (use your Line display name):
UPDATE public.users SET is_moderator = true WHERE display_name = 'Your Display Name';

-- Or by user id (from Table Editor or: SELECT id, display_name FROM public.users;):
-- UPDATE public.users SET is_moderator = true WHERE id = 'uuid-here';
```

### Realtime not updating
- Ensure Supabase Realtime is enabled for the table in the Supabase dashboard
- Check RLS policies allow SELECT for the subscribing user
- For UPDATE/DELETE events with empty `payload.old`, run:
  ```sql
  ALTER TABLE pairings REPLICA IDENTITY FULL;
  ALTER TABLE game_results REPLICA IDENTITY FULL;
  ALTER TABLE session_players REPLICA IDENTITY FULL;
  ```

### Auto-pairing returns "Not enough available players"
- Check `session_players` — are players marked `is_active = true`?
- Check for existing `in_progress` pairings consuming players
- Need minimum 4 players not already in a pairing

### TypeScript errors after Zod changes
- Zod v4 (in use): `z.record()` requires 2 args: `z.record(z.string(), z.string())`
- `z.string().regex()` API is unchanged

## Log Format

All logs are JSON:
```json
{ "level": "info", "message": "User authenticated via Line", "requestId": "...", "userId": "...", "ts": "2026-03-12T..." }
```

Filter in Vercel: Functions → select function → search by requestId field.

## Test Commands

```bash
cd web

# Run all unit tests
npm test -- --run

# Run specific test file
npm test -- tests/unit/domain/pairing.test.ts --run

# Type check
npx tsc --noEmit

# Lint
npm run lint
```
