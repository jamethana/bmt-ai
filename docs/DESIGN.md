# Badminton Pairing v2 — Design Document

Single design document for building the app from scratch. Preserves **core business logic** (sessions, courts, players, pairings, results, ratings) and structures the system so an **AI coding agent** can implement, debug, and evolve it autonomously.

---

## 1. Product overview

### 1.1 Goal

Build a web application to run badminton sessions:

- **Moderators** create sessions, manage player lists, assign courts/matches, and record results.
- **Players** join sessions, see their upcoming matches, and (optionally) record scores.
- The system ensures **fairness**, **reduced waiting time**, and **skill-balanced matches**, and tracks **player ratings** over time.

The design explicitly optimizes for **AI-agent debuggability**:

- Clear, documented domain model.
- Contract-driven APIs and schemas.
- Structured logging and error codes.
- Strong automated tests.
- Simple, reproducible debug workflows.

### 1.2 Target users

- **Moderator (organizer)** — Runs recurring sessions; needs fast setup, visibility, and control; wants overrides and stats.
- **Player** — Attends sessions; wants to know when/where to play and see progress/stats.
- **AI Debugger (agent)** — Has repo and dev-environment access; can run tests, read logs, open the app in a headless browser; needs consistent contracts and observability to locate and fix bugs.

---

## 2. Domain model

### 2.1 Entities

**User**

- **Fields:** `id` (UUID), `displayName`, `avatarUrl` (optional), `authProviderId`, `isModerator`, `skillLevel` (e.g. 1–5), `ratingMu`, `ratingSigma`, `ratingUpdatedAt`, `createdAt`, `updatedAt`.
- **Notes:** `skillLevel` is coarse; `ratingMu`/`ratingSigma` are internal continuous ratings.

**Session**

- **Fields:** `id`, `name`, `date`, `startTime`, `endTime`, `location`, `numCourts`, `maxPlayers`, `status` (`draft` | `active` | `completed` | `cancelled`), `courtNames` (map courtNumber → name), `notes`, permission flags (`allowPlayerAssignEmptyCourt`, `allowPlayerRecordOwnResult`, `allowPlayerRecordAnyResult`, `allowPlayerModifyCourts`, `allowPlayerAccessInviteLink`), `pairingRule` (`least_played` | `longest_wait` | `balanced`), `maxPartnerSkillLevelGap` (1–10; 10 = no restriction), `createdByUserId`, `createdAt`, `updatedAt`.
- **Pairing rule options:**
  - `least_played` — fairness-first: prioritise players with fewest matches played.
  - `longest_wait` — wait-time-first: prioritise players sitting out the longest.
  - `balanced` — default; blends fairness and wait time equally.

**SessionPlayer**

- **Fields:** `id`, `sessionId`, `userId`, `isActive`, `joinedAt`, `leftAt` (optional).
- **Notes:** Represents participation; `isActive` can be toggled if someone leaves.

**Pairing (Match Assignment)**

- **Fields:** `id`, `sessionId`, `courtNumber`, `sequenceNumber`, `status` (`scheduled` | `inProgress` | `completed` | `voided`), `teamAPlayer1Id`, `teamAPlayer2Id`, `teamBPlayer1Id`, `teamBPlayer2Id`, `createdAt`, `startedAt`, `completedAt`.
- **Notes:** Up to four players; can be suggested by algorithm or set manually.

**GameResult**

- **Fields:** `id`, `pairingId`, `teamAScore`, `teamBScore`, `winnerTeam` (`teamA` | `teamB`), `recordedByUserId`, `recordedAt`.
- **Notes:** One primary result per pairing; used for ratings and stats.

**ModeratorDefaultSettings**

- **Fields:** `id`, `moderatorUserId`, default values for new sessions (name, start/end time, location, numCourts, maxPlayers, permission flags, `pairingRule`, `maxPartnerSkillLevelGap`).
- **Notes:** Used to prefill session creation form.

---

## 3. Core user flows

### 3.1 Moderator flows

- **Create session:** New Session form (defaults from ModeratorDefaultSettings) → set name, date, time, location, courts, permissions → save as draft or active.
- **Manage players:** Share invite link/QR → players join → moderator sees list; can mark inactive or remove.
- **Run live session (court dashboard):** Grid of courts; per court: current/next pairing, status; moderator can generate auto-pairing, manually assign, start/void matches, record results.
- **Close session:** Review summary (matches, stats, rating changes) → set status to completed.

### 3.2 Player flows

- **Join session:** Log in → open sessions list or invite link → join → SessionPlayer created.
- **See my matches:** Session page shows “next match” (court + players), recent matches, and whether currently idle or playing.
- **Record results (if allowed):** Button to record result for own match or any match (per session flags); enter scores → system validates permissions and updates stats/ratings.

---

## 4. System architecture

### 4.1 Layers

- **Domain** — Entities, value objects, algorithms, policies. No framework or IO. Pure TypeScript.
- **Application** — Use cases / command handlers (e.g. CreateSession, GeneratePairing, RecordResult) that orchestrate domain + infrastructure.
- **Infrastructure** — DB (repositories), auth, realtime, logging.
- **Interface** — HTTP API and web UI; adapts requests to application layer.

This separation lets an AI agent unit-test domain in isolation, integration-test use cases, and debug infra/UI separately.

---

## 5. API design

### 5.1 Conventions

- **Transport:** HTTPS, JSON.
- **Auth:** Session or Bearer; server resolves current user from request.
- **Response shape:**
  - Success: `{ data: <payload>, requestId: string }`
  - Error: `{ error: { code: string, message: string, details?: object }, requestId: string }`
- **Error codes:** `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `INTERNAL_ERROR`, `DEPENDENCY_ERROR`, `RATE_LIMITED`.

### 5.2 Key endpoints (conceptual)

- `POST /api/sessions` — Create session (moderator); body validated; errors: VALIDATION_ERROR, FORBIDDEN.
- `GET /api/sessions/:sessionId` — Session details and aggregates.
- `GET /api/sessions/:sessionId/players` — List participants.
- `POST /api/sessions/:sessionId/players` — Join session (current user).
- `POST /api/sessions/:sessionId/pairings` — Manual (explicit players) or auto (`{ mode: "auto", courtNumber }`); uses pairing algorithm.
- `GET /api/sessions/:sessionId/pairings` — List pairings (optionally with results).
- `POST /api/pairings/:pairingId/results` — Record result (subject to permissions).
- `GET /api/players/:playerId/stats` — Player stats.

Maintain an **OpenAPI 3** spec for all endpoints so an AI agent and tooling can read contracts programmatically.

---

## 6. Pairing algorithm

### 6.1 Goals

- **Fairness:** Equalize matches played; minimize games since last played for those waiting.
- **Variety:** Avoid repeating same partners/opponents.
- **Skill balance:** Keep combined team ratings close.

### 6.2 Inputs

For a session: `activePlayers` (with ratings and session stats), `existingPairings` (with results). Derived per player: `matchesPlayed`, `wins`/`losses`, `gamesSinceLastPlayed`, `pastPartners`, `pastOpponents`.

### 6.3 Algorithm design

**Key principle:** The moderator's goal is for everyone to have fun. Players get frustrated when they (a) play too little, (b) wait too long, (c) face a lopsided skill mismatch, or (d) keep playing with the same people. The algorithm balances all four concerns simultaneously.

**Scoring model:** Every candidate assignment is scored 0–1 using four independently-normalised signals combined with rule-specific weights:

| Signal | What it measures | Normalisation |
|---|---|---|
| `wait` | Sum of `gamesSinceLastPlayed` for the 4 players, amplified exponentially (long waits matter more than linearly) | Divided by max wait in pool |
| `fairness` | Inverse of total matches played (less-played = higher score) | Divided by max played in pool |
| `balance` | How close the two team rating sums are | Normalised by the realistic max team-sum gap in pool |
| `variety` | Penalises repeated partners (×2 weight) and opponents (×1), using counts not booleans | Capped at 8 repeat-units = 0 |

Normalising before weighting prevents any single signal from dominating (e.g. raw rating diffs in the thousands would otherwise overwhelm fairness signals in the tens).

**Rule weight profiles** (all sum to 1.0):

| Rule | wait | fairness | balance | variety |
|---|---|---|---|---|
| `least_played` | 0.10 | 0.50 | 0.25 | 0.15 |
| `longest_wait` | 0.50 | 0.15 | 0.20 | 0.15 |
| `balanced` | 0.25 | 0.25 | 0.30 | 0.20 |

**Full enumeration (no candidate pre-filter):** Sort-then-cut anti-pattern removed. Sorting by one metric then hard-cutting to N candidates prevents the scorer from ever seeing players who'd produce a better balanced game. For badminton sessions (≤30 bench players), C(30,4)×3 splits ≈ 80k score calls — under 5ms in JS.

**Three team splits per combination:** For players (p1,p2,p3,p4) all three distinct splits are evaluated: (12v34), (13v24), (14v23).

**`maxPartnerSkillLevelGap` as a hard filter with graceful fallback:** Violations are skipped. If no valid combination exists (too strict for the pool), the constraint is relaxed rather than returning null — empty courts are worse than a slightly mismatched pairing.

**Steps:**

1. Exclude players currently in an `in_progress` pairing.
2. Compute per-player stats (matchesPlayed, gamesSinceLastPlayed, partnerHistory, opponentHistory) from session history.
3. Compute pool-level normalisation context (maxWait, maxMatchesPlayed, maxRatingSpread).
4. Enumerate all C(n,4) combinations × 3 splits; apply skill-gap filter; score each; return highest-scoring assignment.

Implemented as a **pure, deterministic** function so it is easy to unit-test and safe for an AI to refactor.

---

## 7. Permissions model

### 7.1 Concepts

- **System:** Moderator vs Player; moderators can override most restrictions.
- **Session flags:** `allowPlayerAssignEmptyCourt`, `allowPlayerRecordOwnResult`, `allowPlayerRecordAnyResult`, `allowPlayerModifyCourts`, `allowPlayerAccessInviteLink`.

### 7.2 Permission functions (pure, testable)

- **canAssignCourt(context)** — context: `{ isModerator, sessionFlags }`. True if moderator or `allowPlayerAssignEmptyCourt`.
- **canRecordOwnResult(context)** — context: `{ isModerator, sessionFlags, pairing, userId }`. True if moderator or (user in pairing and (allowPlayerRecordOwnResult or allowPlayerRecordAnyResult)).
- **canRecordAnyResult(context)** — context: `{ isModerator, sessionFlags }`. True if moderator or `allowPlayerRecordAnyResult`.

All API handlers and UI actions must use these functions so logic is centralized and testable.

---

## 8. Observability and AI-agent debuggability

### 8.1 Structured logging

- **Logger** with `info`, `warn`, `error` and structured fields: `requestId`, `userId`, `route`, `operation`, `sessionId`, `errorCode`.
- Every API request gets a `requestId` on entry; pass it through to logs and include it in the HTTP response.
- Logs in JSON format so an AI can parse and filter.

### 8.2 Request tracing

- Middleware assigns `requestId` (e.g. UUID) per request; attach to log context and response.
- Enables: observe failing request → capture requestId → filter logs → reconstruct scenario.

### 8.3 Error boundaries and UI

- Error boundaries at app root and at route-segment level (e.g. player area, moderator area).
- On error: show user-friendly message; in dev, also show error code and optional requestId so an AI can map “visible error” to logs/API.

### 8.4 Test strategy

- **Unit:** Domain algorithms and policies (pairing, permissions, rating updates, stats).
- **Integration:** Application use cases with test DB (create session, join, generate pairing, record result).
- **E2E:** One full flow (e.g. moderator creates session → players join → auto-pairing → record result → verify stats).

An AI agent can run tests to catch regressions, narrow failures to domain vs application vs infra, and validate fixes.

### 8.5 Debug snapshot (optional)

- For critical flows, on severe error store: input payloads, relevant DB rows (anonymized), requestId.
- Dev-only tool: given requestId, replay scenario locally so an AI can fetch snapshot, re-run logic, change code, and verify.

---

## 9. Documentation for humans and agents

Include in the repo:

- **ARCHITECTURE.md** — Short overview of entities, layers, and main flows.
- **DEBUGGING.md** — Step-by-step: reproduce → capture requestId → inspect logs → check DB → add/run tests → minimal fix → verify.
- **openapi.yaml** — API contracts; keep in sync with code.
- **RLS.md** (or equivalent) — Database-level access rules so an AI knows who can access what.

---

## 10. Suggested repository layout

```
/ (repo root)
  app/                    # Next.js app routes (UI + API)
  src/
    domain/               # Pure domain logic
      entities/
      algorithms/
      policies/
      services/
    application/          # Use cases / commands
    infrastructure/       # DB, auth, logging, realtime adapters
    ui/                   # Shared presentational components
  tests/
    unit/
    integration/
    e2e/
  docs/
    DESIGN.md             # This file
    ARCHITECTURE.md
    DEBUGGING.md
    RLS.md
  config/
    openapi.yaml
```
An AI agent can use this design to scaffold types and entities, implement repositories and adapters, wire application use cases and API routes, add tests and logging, and iterate while staying aligned with the documented contracts and flows.

---

## 11. Development & agent workflow

This section defines how an AI coding agent (and its sub-agents) should work on this repo.

### 11.1 Roles / “agents”

- **Orchestrator / Planner**
  - Reads `DESIGN.md` and any feature request.
  - Clarifies requirements, identifies affected areas, and breaks work into steps.
  - Updates docs when behavior or contracts change.

- **Backend + Supabase specialist**
  - Owns `src/domain`, `src/application`, and backend parts of `src/infrastructure` (DB, auth, logging, Supabase).
  - Implements use cases, repositories, and API handlers under `app/api`.
  - Keeps DB schemas, RLS rules, and application logic consistent with the domain model.

- **Frontend + UX specialist**
  - Owns React/Next.js routes in `app/` and shared UI in `src/ui`.
  - Implements screens and components for moderator/player flows.
  - Applies performance and accessibility best practices (per React/Next.js guidelines).

- **Infra / Vercel specialist**
  - Owns deployment- and environment-related configuration (Vercel project settings, environment variables, build settings).
  - Investigates build/runtime issues in deployed environments and keeps local vs deployed configs aligned.

- **Debug / Review specialist**
  - Runs tests, inspects logs, and performs focused code review before merging large or risky changes.
  - Confirms that behavior matches design and that observability hooks (logging, requestId, error codes) remain intact.

Specialized concerns like **Line auth**, **Supabase Realtime**, or **Postgres performance** should generally be treated as *skills/modes* of the backend/infra specialists, not separate long‑running agents.

### 11.2 Standard development flow

For any non‑trivial change, follow this flow:

1. **Plan**
   - Orchestrator reads the request and relevant docs.
   - Define the change as a small list of steps (backend, frontend, infra as needed).
   - Update or extend `DESIGN.md` / `ARCHITECTURE.md` *first* if the change alters contracts, entities, or flows.

2. **Implement backend (if applicable)**
   - Backend specialist changes domain/application/infrastructure code and any `app/api` routes.
   - Keep APIs contract-driven; update `openapi.yaml` when endpoint shapes change.
   - Add or update unit/integration tests covering new or changed behaviors.

3. **Implement frontend (if applicable)**
   - Frontend specialist builds or updates pages/components against the documented APIs.
   - Wire UI to call the correct endpoints and display errors using error codes/requestId where relevant.
   - Consider UX and accessibility, especially for core moderator/player flows.

4. **Auth / security pass (when relevant)**
   - If changes touch login, session management, or permissions:
     - Re-check Line OAuth + Supabase auth flows.
     - Re-validate permission helpers (e.g. `canAssignCourt`, `canRecordOwnResult`) against new behavior.
     - Ensure RLS rules (documented in `RLS.md`) still enforce intended access patterns.

5. **Test & debug**
   - Run unit/integration/E2E tests relevant to the change.
   - Use structured logging and `requestId` to trace and fix issues.
   - Let the Debug/Review specialist propose refactors if code becomes complex or duplicates logic.

6. **Review & document**
   - Summarize the change (what/why) in commit messages and, if needed, in `DEBUGGING.md` (for tricky failure modes).
   - Ensure docs and OpenAPI remain in sync with the implemented behavior.

7. **Deploy & verify**
   - Infra/Vercel specialist verifies build, environment variables, and runtime logs.
   - Spot-check the main flows in the deployed environment (especially those touched by the change).

This workflow is intentionally linear and explicit so that an AI agent can pick up any step, understand context quickly, and make safe, debuggable changes that stay aligned with the domain and product design.
