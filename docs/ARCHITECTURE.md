# Badminton Pairing v2 — Architecture

## Entity Diagram

```
User
 └── has many SessionPlayers
 └── created_by Sessions
 └── has one ModeratorDefaultSettings

Session
 └── has many SessionPlayers
 └── has many Pairings

SessionPlayer
 └── belongs to User
 └── belongs to Session

Pairing
 └── belongs to Session
 └── references 4 Users (team_a_player1/2, team_b_player1/2)
 └── has one GameResult

GameResult
 └── belongs to Pairing
 └── recorded_by User
```

## Layer Overview

```
┌──────────────────────────────────────────────────────┐
│  Interface (Next.js App Router)                      │
│  app/                — pages (RSC + client)          │
│  app/api/            — API route handlers            │
├──────────────────────────────────────────────────────┤
│  Application (use cases)                             │
│  src/application/    — (future use-case handlers)    │
├──────────────────────────────────────────────────────┤
│  Domain (pure TypeScript, no IO)                     │
│  src/domain/entities/       — TypeScript interfaces  │
│  src/domain/algorithms/     — pairing algorithm      │
│  src/domain/policies/       — permission functions   │
├──────────────────────────────────────────────────────┤
│  Infrastructure (IO adapters)                        │
│  src/infrastructure/db/     — Supabase clients       │
│  src/infrastructure/auth/   — JWT session helpers    │
│  src/infrastructure/logging/— structured logger      │
└──────────────────────────────────────────────────────┘
```

## Data Flow — Auto-Pairing

1. Moderator clicks "Auto-Pair" on court N in `CourtDashboard`
2. `POST /api/sessions/:id/pairings` with `{ mode: "auto", courtNumber: N }`
3. Route handler fetches active players + completed pairings from DB
4. Builds `PlayerStats[]` (skill rating, match history, wait time)
5. Calls `generatePairing(players, pairingRule, maxSkillGap)` → `PairingResult`
6. Inserts new `pairings` row into Supabase
7. Supabase Realtime broadcasts the INSERT to all subscribed clients
8. `CourtDashboard` receives the update and re-renders the court card

## Data Flow — Authentication

1. User visits `/join/:sessionId` or clicks "Login with Line"
2. Redirect to `https://access.line.me/oauth2/v2.1/authorize`
3. Line redirects to `/api/auth/callback?code=...`
4. Server exchanges code → Line access token → profile
5. Upserts `users` row (keyed on `line_user_id`)
6. Signs a JWT with `jose` (HS256, 30-day expiry) including `userId`, `isModerator`
7. Sets `bmt_session` httpOnly cookie
8. All subsequent API calls read this cookie via `requireAuth()`

## Key Files

| File | Purpose |
|---|---|
| `src/domain/algorithms/pairing.ts` | Core pairing algorithm (pure, testable) |
| `src/domain/policies/permissions.ts` | Permission gate functions |
| `src/infrastructure/auth/session.ts` | JWT sign/verify |
| `src/infrastructure/auth/require-auth.ts` | API route auth middleware |
| `src/infrastructure/db/supabase-admin.ts` | Service-role DB client (server-only) |
| `src/infrastructure/logging/logger.ts` | Structured JSON logger |
| `src/lib/api-response.ts` | Typed success/error response helpers |
| `app/api/sessions/` | Sessions CRUD API |
| `app/api/pairings/` | Pairing status + result API |
| `app/sessions/[sessionId]/CourtDashboard.tsx` | Live court view with Realtime |
