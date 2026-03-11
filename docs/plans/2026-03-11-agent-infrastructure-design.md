# Agent Infrastructure Design
_2026-03-11_

## Problem statement

Three recurring failures from the previous version of this app:

1. **AI couldn't verify changes** — no mechanism for the agent to open the locally running app and confirm UI changes actually worked visually.
2. **UX was inconsistent and felt slow** — missing skeleton loading states, no realtime sync for multi-user scenarios (multiple users watching the court dashboard simultaneously), and no mobile consideration.
3. **Auth bugs dominated** — Line OAuth + Supabase session exchange has several failure modes (state mismatch, code expiry, redirect URI mismatch, session-null-after-login) that the AI kept re-introducing because there were no persistent guardrails.

## Approach: Layered Coverage (Approach B)

Three layers:
- **Rules** — always-on guardrails that fire when editing matching files
- **Skills** — domain knowledge injected on demand
- **Subagents** — autonomous agents for verification and diagnosis

---

## Layer 1: Cursor Rules (`.cursor/rules/`)

### `loading-states.mdc`
- **Scope:** `**/*.tsx`
- **Enforces:** Every async data-fetching component must implement a skeleton loading state using the Shadcn `<Skeleton>` primitive. `useEffect` + state patterns pair with explicit `isLoading` and `error` states. Supabase queries must handle the loading phase.

### `realtime-patterns.mdc`
- **Scope:** `**/*.tsx`, `**/hooks/**`
- **Enforces:** Any data mutated by multiple users (sessions, pairings, players, scores) must use Supabase Realtime subscriptions. Subscriptions cleaned up in `useEffect` return. Handles `INSERT`, `UPDATE`, `DELETE`. Channel naming convention: `session:{sessionId}:{tableName}`.

### `auth-error-handling.mdc`
- **Scope:** `**/auth/**`, `**/api/**`
- **Enforces:** Documents the exact Line → Supabase flow. Validates `state` param on callback, handles `error` query param, handles code expiry. Server routes always check session before reading user. `TEST_MODE_AUTH_BYPASS` usage documented for local dev.

### `api-response-shape.mdc`
- **Scope:** `**/api/**`
- **Enforces:** Consistent response shape from `docs/DESIGN.md` — `{ data, requestId }` on success, `{ error: { code, message }, requestId }` on failure. `requestId` injected by middleware.

---

## Layer 2: New Project Skills (`.cursor/skills/`)

### `line-auth-supabase/`
- **Triggers:** Auth files, callbacks, Line integration work
- **Content:** Line LIFF vs Line Login distinction, exact redirect flow, `NEXT_PUBLIC_LINE_CALLBACK_URL` requirements, manual code exchange pattern (not `signInWithOAuth`), common pitfalls (state mismatch, code expiry, PKCE confusion), `TEST_MODE_AUTH_BYPASS` local dev pattern.

### `supabase-realtime/`
- **Triggers:** Session/match/player data hooks, real-time features
- **Content:** `postgres_changes` vs `broadcast`, court dashboard subscription pattern, debouncing high-frequency updates, presence for "who is viewing", RLS + `REPLICA IDENTITY FULL` requirement for UPDATE/DELETE events.

---

## Layer 3: Project Subagents (`.cursor/agents/`)

### `browser-tester.md`
- **Purpose:** Visually verify UI changes on `http://localhost:3000`
- **Tools:** `cursor-ide-browser` MCP
- **Workflow:** Navigate → snapshot → verify expected state (loading, loaded, error) → report with screenshots
- **Trigger:** After any UI change; or explicitly "use browser-tester to verify"

### `auth-debugger.md`
- **Purpose:** Systematic Line + Supabase auth failure diagnosis
- **Tools:** `cursor-ide-browser` MCP + Supabase MCP
- **Workflow:** Check callback URL error params → verify redirect URI matches env → test flow in browser → check Supabase auth logs → verify TEST_MODE_AUTH_BYPASS
- **Trigger:** Auth failures, wrong redirects, null session after login

### `ux-reviewer.md`
- **Purpose:** UX checklist review before considering UI work done
- **Tools:** `cursor-ide-browser` MCP + `web-design-guidelines` skill
- **Checklist:** Skeleton loading on every async element, realtime where relevant, mobile layout, no layout shifts, consistent Shadcn components
- **Trigger:** "Review UX for [page]" or before committing UI changes

---

## What this does NOT include

- Automated test runner subagent — the design doc already calls for a strong test strategy; tests are written alongside features, not delegated to a separate agent
- Vercel deployment verification — out of scope for this phase; local testing is the priority
- General code reviewer — the existing react-best-practices and composition-patterns skills already cover this

---

## File manifest

```
.cursor/
  rules/
    loading-states.mdc
    realtime-patterns.mdc
    auth-error-handling.mdc
    api-response-shape.mdc
  skills/
    line-auth-supabase/
      SKILL.md
    supabase-realtime/
      SKILL.md
  agents/
    browser-tester.md
    auth-debugger.md
    ux-reviewer.md
```
