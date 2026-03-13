# Row Level Security (RLS) Policies

This document describes the intended RLS approach for each table. The app currently uses the **service role key** (`createAdminClient`) for all server-side API operations, which bypasses RLS. RLS is a future hardening step.

## Current State

All API routes use `SUPABASE_SERVICE_ROLE_KEY` via `createAdminClient()`, which bypasses RLS entirely. Permission enforcement is done in application code via `requireAuth()` and `canAssign*` / `canRecord*` policy functions.

## Intended RLS per Table

### `users`
- **SELECT**: Any authenticated user can read any user's public fields
- **UPDATE**: Only the user themselves (or service role)
- **INSERT/DELETE**: Service role only

### `sessions`
- **SELECT**: Any authenticated user (players need to see sessions they've joined)
- **INSERT**: Service role only (moderators checked in API layer)
- **UPDATE**: Service role only
- **DELETE**: Service role only

### `session_players`
- **SELECT**: Any authenticated user who is in that session, or the session moderator
- **INSERT**: Any authenticated user (joining themselves)
- **UPDATE**: Service role only (moderators can mark inactive)
- **DELETE**: Service role only

### `pairings`
- **SELECT**: Any authenticated user who is a session player or moderator
- **INSERT**: Service role only (moderator-gated in API)
- **UPDATE**: Service role only
- **DELETE**: Service role only

### `game_results`
- **SELECT**: Any authenticated user who is a session player or moderator
- **INSERT**: Service role only (permission-gated via `canRecordOwnResult` / `canRecordAnyResult`)
- **UPDATE/DELETE**: Service role only

### `moderator_default_session_settings`
- **SELECT**: Own row only (`user_id = auth.uid()`)
- **INSERT/UPDATE**: Own row only
- **DELETE**: Service role only

## Enabling RLS

To enable RLS with the anon client instead of service role:

1. Enable RLS on each table in Supabase dashboard
2. Create policies per the table descriptions above
3. Pass the session JWT to Supabase as the user context (requires Supabase custom auth integration)
4. Switch API routes from `createAdminClient()` to `createServerClient()`

See [Supabase Custom Auth docs](https://supabase.com/docs/guides/auth/jwts) for setting a custom JWT secret.

## Replica Identity

For Realtime UPDATE/DELETE events to include the full old row:
```sql
ALTER TABLE pairings REPLICA IDENTITY FULL;
ALTER TABLE session_players REPLICA IDENTITY FULL;
ALTER TABLE game_results REPLICA IDENTITY FULL;
```
