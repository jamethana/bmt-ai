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
