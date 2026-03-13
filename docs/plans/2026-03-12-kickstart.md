# Badminton Pairing v2 — Kickstart Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the complete Badminton Pairing v2 web app from scaffold to production-ready MVP.

**Architecture:** Next.js 16 App Router with Tailwind v4 + shadcn/ui on the frontend; pure TypeScript domain/application layers; Supabase for DB, auth (Line OAuth via custom JWT), and Realtime. API routes follow a contract-driven `{ data, requestId }` / `{ error, requestId }` shape with structured logging.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Supabase (postgres + realtime + storage), Line OAuth (custom), Vitest for unit/integration tests.

---

## DB Schema Reality (matches design doc with minor naming)

| Design doc field | DB column |
|---|---|
| `authProviderId` | `line_user_id` |
| `avatarUrl` | `picture_url` |
| `ratingMu` / `ratingSigma` | `trueskill_mu` / `trueskill_sigma` |
| `allowPlayerModifyCourts` | `allow_player_add_remove_courts` |
| `createdByUserId` | `created_by` |
| `recordedByUserId` | `recorded_by` |

Sessions also have `show_skill_level_pills` (extra feature flag). Users have `auth_secret` for custom JWT signing.

New fields added via migration `add_pairing_rule_and_skill_gap`:
- `sessions.pairing_rule` — enum: `least_played` | `longest_wait` | `balanced` (default: `least_played`)
- `sessions.max_partner_skill_level_gap` — integer 1–10 (default: `10` = no restriction)
- Same two columns mirrored on `moderator_default_session_settings`

---

## Phase 1: Project Foundation

### Task 1.1: Install shadcn/ui and core dependencies

**Files:**
- Modify: `web/package.json`
- Create: `web/components.json`
- Modify: `web/app/globals.css`

**Step 1:** Install shadcn/ui and required packages

```bash
cd web
npx shadcn@latest init --defaults
npx shadcn@latest add button card badge skeleton input label select textarea switch separator dialog sheet toast avatar
```

**Step 2:** Install additional deps

```bash
npm install zod jose date-fns clsx tailwind-merge class-variance-authority lucide-react
npm install -D vitest @vitejs/plugin-react @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

**Step 3:** Install types/utils

```bash
npm install server-only
```

**Step 4:** Verify dev server starts

```bash
npm run dev
```

Expected: App loads at http://localhost:3000

**Step 5:** Commit

```bash
git add -A && git commit -m "feat: install shadcn/ui, vitest, and core dependencies"
```

---

### Task 1.2: Set up project directory structure

**Files:**
- Create: `web/src/domain/entities/index.ts`
- Create: `web/src/domain/algorithms/pairing.ts`
- Create: `web/src/domain/policies/permissions.ts`
- Create: `web/src/application/use-cases/` (directory)
- Create: `web/src/infrastructure/db/repositories/` (directory)
- Create: `web/src/infrastructure/auth/` (directory)
- Create: `web/src/infrastructure/logging/logger.ts`
- Create: `web/src/ui/components/` (directory)
- Create: `web/tests/unit/` (directory)
- Create: `web/tests/integration/` (directory)
- Create: `web/vitest.config.ts`

**Step 1:** Create vitest config

```typescript
// web/vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
```

**Step 2:** Create test setup

```typescript
// web/tests/setup.ts
import "@testing-library/jest-dom";
```

**Step 3:** Add test script to package.json

```json
"test": "vitest",
"test:ui": "vitest --ui"
```

**Step 4:** Create all directories with `.gitkeep` files, then commit.

```bash
git add -A && git commit -m "feat: scaffold project directory structure and vitest config"
```

---

### Task 1.3: Define TypeScript domain entities

**Files:**
- Create: `web/src/domain/entities/index.ts`
- Create: `web/tests/unit/domain/entities.test.ts`

**Step 1:** Write type definitions

```typescript
// web/src/domain/entities/index.ts

export type SessionStatus = "draft" | "active" | "completed" | "cancelled";
export type PairingStatus = "scheduled" | "in_progress" | "completed" | "voided";
export type WinnerTeam = "teamA" | "teamB";
/**
 * least_played   — fairness-first: prioritise players who have played fewest matches
 * longest_wait   — wait-time-first: prioritise players sitting out the longest
 * balanced       — blend fairness + wait time (default)
 */
export type PairingRule = "least_played" | "longest_wait" | "balanced";

export interface User {
  id: string;
  lineUserId: string | null;
  displayName: string;
  pictureUrl: string | null;
  skillLevel: number; // 1-10
  calculatedSkillRating: number | null;
  isModerator: boolean;
  trueskillMu: number | null;
  trueskillSigma: number | null;
  trueskillUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  name: string;
  date: string; // ISO date YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location: string | null;
  numCourts: number;
  maxPlayers: number;
  status: SessionStatus;
  createdBy: string | null;
  courtNames: Record<string, string>; // courtNumber → name
  notes: string | null;
  showSkillLevelPills: boolean;
  allowPlayerAssignEmptyCourt: boolean;
  allowPlayerRecordOwnResult: boolean;
  allowPlayerRecordAnyResult: boolean;
  allowPlayerAddRemoveCourts: boolean;
  allowPlayerAccessInviteQr: boolean;
  pairingRule: PairingRule;
  maxPartnerSkillLevelGap: number; // 1–10; 10 = no restriction
  createdAt: string;
  updatedAt: string;
}

export interface SessionPlayer {
  id: string;
  sessionId: string;
  userId: string;
  isActive: boolean;
  createdAt: string;
  user?: User; // joined
}

export interface Pairing {
  id: string;
  sessionId: string;
  courtNumber: number;
  sequenceNumber: number;
  status: PairingStatus;
  teamAPlayer1: string | null;
  teamAPlayer2: string | null;
  teamBPlayer1: string | null;
  teamBPlayer2: string | null;
  createdAt: string;
  completedAt: string | null;
  result?: GameResult; // joined
}

export interface GameResult {
  id: string;
  pairingId: string;
  teamAScore: number;
  teamBScore: number;
  winnerTeam: WinnerTeam;
  recordedBy: string | null;
  recordedAt: string;
}

export interface ModeratorDefaultSettings {
  userId: string;
  name: string;
  startTime: string;
  endTime: string;
  location: string | null;
  numCourts: number;
  maxPlayers: number;
  showSkillLevelPills: boolean;
  allowPlayerAssignEmptyCourt: boolean;
  allowPlayerRecordOwnResult: boolean;
  allowPlayerRecordAnyResult: boolean;
  allowPlayerAddRemoveCourts: boolean;
  allowPlayerAccessInviteQr: boolean;
  pairingRule: PairingRule;
  maxPartnerSkillLevelGap: number; // 1–10; 10 = no restriction
  updatedAt: string;
}
```

**Step 2:** Verify file compiles (tsc check)

```bash
cd web && npx tsc --noEmit
```

**Step 3:** Commit

```bash
git add -A && git commit -m "feat: add domain entity TypeScript types"
```

---

### Task 1.4: Set up structured logging and API response helpers

**Files:**
- Create: `web/src/infrastructure/logging/logger.ts`
- Create: `web/src/lib/api-response.ts`
- Create: `web/src/lib/request-id.ts`
- Create: `web/tests/unit/lib/api-response.test.ts`

**Step 1:** Create logger

```typescript
// web/src/infrastructure/logging/logger.ts
export interface LogContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  route?: string;
  operation?: string;
  errorCode?: string;
  [key: string]: unknown;
}

export function createLogger(baseContext: LogContext = {}) {
  return {
    info: (message: string, ctx: LogContext = {}) =>
      console.log(JSON.stringify({ level: "info", message, ...baseContext, ...ctx, ts: new Date().toISOString() })),
    warn: (message: string, ctx: LogContext = {}) =>
      console.warn(JSON.stringify({ level: "warn", message, ...baseContext, ...ctx, ts: new Date().toISOString() })),
    error: (message: string, ctx: LogContext = {}) =>
      console.error(JSON.stringify({ level: "error", message, ...baseContext, ...ctx, ts: new Date().toISOString() })),
  };
}

export const logger = createLogger();
```

**Step 2:** Create API response helpers

```typescript
// web/src/lib/api-response.ts
import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR"
  | "DEPENDENCY_ERROR"
  | "RATE_LIMITED";

export function apiSuccess<T>(data: T, requestId: string, status = 200) {
  return NextResponse.json({ data, requestId }, { status });
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  requestId: string,
  status: number,
  details?: object
) {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) }, requestId },
    { status }
  );
}
```

**Step 3:** Create request-id utility

```typescript
// web/src/lib/request-id.ts
import { randomUUID } from "crypto";

export function generateRequestId(): string {
  return randomUUID();
}
```

**Step 4:** Write tests for api-response helpers

```typescript
// web/tests/unit/lib/api-response.test.ts
import { describe, it, expect } from "vitest";
import { apiSuccess, apiError } from "@/src/lib/api-response";

describe("apiSuccess", () => {
  it("returns JSON with data and requestId", async () => {
    const res = apiSuccess({ id: "1" }, "req-123");
    const body = await res.json();
    expect(body).toEqual({ data: { id: "1" }, requestId: "req-123" });
    expect(res.status).toBe(200);
  });
});

describe("apiError", () => {
  it("returns JSON with error shape", async () => {
    const res = apiError("NOT_FOUND", "Session not found", "req-123", 404);
    const body = await res.json();
    expect(body).toEqual({
      error: { code: "NOT_FOUND", message: "Session not found" },
      requestId: "req-123",
    });
    expect(res.status).toBe(404);
  });
});
```

**Step 5:** Run tests

```bash
cd web && npm test -- tests/unit/lib/api-response.test.ts
```

Expected: 2 passing

**Step 6:** Commit

```bash
git add -A && git commit -m "feat: add structured logger and API response helpers"
```

---

### Task 1.5: Set up Supabase server-side client helpers

**Files:**
- Create: `web/src/infrastructure/db/supabase-server.ts`
- Create: `web/src/infrastructure/db/supabase-admin.ts`
- Modify: `web/lib/supabaseClient.ts` (move/rename to infrastructure)

**Step 1:** Create server-side Supabase client (uses service role key, server-only)

```typescript
// web/src/infrastructure/db/supabase-admin.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Missing Supabase admin env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}
```

**Step 2:** Create anon client for server components (respects RLS with session token)

```typescript
// web/src/infrastructure/db/supabase-server.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createServerClient() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("bmt_session")?.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(url, key, { auth: { persistSession: false } });
  // We use custom auth; pass user id via header if needed for RLS
  return { client, sessionToken };
}
```

**Step 3:** Commit

```bash
git add -A && git commit -m "feat: add Supabase server-side client helpers"
```

---

## Phase 2: Line OAuth + Custom Auth

### Task 2.1: Domain auth types and token utilities

**Files:**
- Create: `web/src/infrastructure/auth/session.ts`
- Create: `web/tests/unit/auth/session.test.ts`

**Step 1:** Create session token helpers using `jose`

```typescript
// web/src/infrastructure/auth/session.ts
import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
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
```

**Step 2:** Write tests

```typescript
// web/tests/unit/auth/session.test.ts
import { describe, it, expect } from "vitest";
import { createSessionToken, verifySessionToken } from "@/src/infrastructure/auth/session";

describe("session tokens", () => {
  const payload = {
    userId: "user-1",
    lineUserId: "line-1",
    displayName: "Alice",
    isModerator: false,
  };

  it("creates and verifies a valid token", async () => {
    const token = await createSessionToken(payload);
    const verified = await verifySessionToken(token);
    expect(verified?.userId).toBe("user-1");
    expect(verified?.displayName).toBe("Alice");
  });

  it("returns null for invalid token", async () => {
    const result = await verifySessionToken("invalid.token.here");
    expect(result).toBeNull();
  });
});
```

**Step 3:** Run tests

```bash
cd web && npm test -- tests/unit/auth/session.test.ts
```

Expected: 2 passing

**Step 4:** Add `AUTH_SECRET` to `.env.local`

```bash
echo "AUTH_SECRET=$(openssl rand -hex 32)" >> .env.local
```

**Step 5:** Commit

```bash
git add -A && git commit -m "feat: add JWT session token helpers for custom auth"
```

---

### Task 2.2: Line OAuth callback API route

**Files:**
- Create: `web/app/api/auth/callback/route.ts`
- Create: `web/app/api/auth/me/route.ts`
- Create: `web/app/api/auth/logout/route.ts`

**Step 1:** Create the callback handler

```typescript
// web/app/api/auth/callback/route.ts
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/src/infrastructure/db/supabase-admin";
import { createSessionToken, COOKIE_NAME, MAX_AGE } from "@/src/infrastructure/auth/session";
import { generateRequestId } from "@/src/lib/request-id";
import { apiError, apiSuccess } from "@/src/lib/api-response";
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
    const lineUserId = profile.userId as string;
    const displayName = profile.displayName as string;
    const pictureUrl = profile.pictureUrl as string | undefined;

    // Upsert user in DB
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
      logger.error("User upsert failed", { requestId, errorCode: "INTERNAL_ERROR" });
      return apiError("INTERNAL_ERROR", "Failed to create user", requestId, 500);
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
```

**Step 2:** Create `/api/auth/me` (returns current session user)

```typescript
// web/app/api/auth/me/route.ts
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/src/infrastructure/auth/session";
import { createAdminClient } from "@/src/infrastructure/db/supabase-admin";
import { apiSuccess, apiError } from "@/src/lib/api-response";
import { generateRequestId } from "@/src/lib/request-id";

export async function GET(_req: NextRequest) {
  const requestId = generateRequestId();
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return apiError("UNAUTHORIZED", "Not authenticated", requestId, 401);
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return apiError("UNAUTHORIZED", "Invalid session", requestId, 401);
  }

  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, display_name, picture_url, is_moderator, skill_level, calculated_skill_rating, trueskill_mu")
    .eq("id", session.userId)
    .single();

  if (!user) {
    return apiError("NOT_FOUND", "User not found", requestId, 404);
  }

  return apiSuccess(user, requestId);
}
```

**Step 3:** Create logout route

```typescript
// web/app/api/auth/logout/route.ts
import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/src/infrastructure/auth/session";
import { NextRequest } from "next/server";

export async function POST(_req: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return Response.redirect(new URL("/", _req.url));
}
```

**Step 4:** Commit

```bash
git add -A && git commit -m "feat: add Line OAuth callback and auth API routes"
```

---

### Task 2.3: Auth context and hook for client components

**Files:**
- Create: `web/src/ui/auth/AuthContext.tsx`
- Create: `web/src/ui/auth/useAuth.ts`
- Modify: `web/app/layout.tsx`

**Step 1:** Create AuthContext

```typescript
// web/src/ui/auth/AuthContext.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";

export interface AuthUser {
  id: string;
  display_name: string;
  picture_url: string | null;
  is_moderator: boolean;
  skill_level: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  logout: async () => {},
  refetch: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchUser() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const { data } = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { fetchUser(); }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, refetch: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

**Step 2:** Wrap layout with AuthProvider and wire up the Login button

```typescript
// web/app/layout.tsx
// Add <AuthProvider> wrapping <body> content
// Replace static Login button with <HeaderAuth> client component
```

Create `web/src/ui/layout/HeaderAuth.tsx`:

```typescript
"use client";
import { useAuth } from "@/src/ui/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const LINE_LOGIN_URL = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_LINE_CHANNEL_ID}&redirect_uri=${process.env.NEXT_PUBLIC_LINE_CALLBACK_URL}&state=xxx&scope=profile`;

export function HeaderAuth() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) return <div className="h-7 w-24 animate-pulse rounded-full bg-slate-800" />;

  if (!user) {
    return (
      <a href={LINE_LOGIN_URL}>
        <Button variant="outline" size="sm" className="border-slate-700 text-xs">
          Login with Line
        </Button>
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-slate-400 sm:inline">{user.display_name}</span>
      <Avatar className="h-7 w-7">
        <AvatarImage src={user.picture_url ?? undefined} />
        <AvatarFallback className="bg-emerald-500 text-xs text-slate-950">
          {user.display_name[0]}
        </AvatarFallback>
      </Avatar>
      <button onClick={logout} className="text-xs text-slate-400 hover:text-slate-200">
        Logout
      </button>
    </div>
  );
}
```

**Step 3:** Verify login flow works (browser test)

**Step 4:** Commit

```bash
git add -A && git commit -m "feat: add auth context, HeaderAuth component, wire layout"
```

---

## Phase 3: Domain Logic

### Task 3.1: Permission policies (pure, testable)

**Files:**
- Create: `web/src/domain/policies/permissions.ts`
- Create: `web/tests/unit/domain/permissions.test.ts`

**Step 1:** Write failing tests first

```typescript
// web/tests/unit/domain/permissions.test.ts
import { describe, it, expect } from "vitest";
import { canAssignCourt, canRecordOwnResult, canRecordAnyResult } from "@/src/domain/policies/permissions";

const baseSession = {
  allowPlayerAssignEmptyCourt: false,
  allowPlayerRecordOwnResult: false,
  allowPlayerRecordAnyResult: false,
};

describe("canAssignCourt", () => {
  it("allows moderator regardless of flags", () => {
    expect(canAssignCourt({ isModerator: true, session: baseSession })).toBe(true);
  });
  it("allows player when flag is on", () => {
    expect(canAssignCourt({ isModerator: false, session: { ...baseSession, allowPlayerAssignEmptyCourt: true } })).toBe(true);
  });
  it("denies player when flag is off", () => {
    expect(canAssignCourt({ isModerator: false, session: baseSession })).toBe(false);
  });
});

describe("canRecordOwnResult", () => {
  const pairing = { teamAPlayer1: "u1", teamAPlayer2: "u2", teamBPlayer1: "u3", teamBPlayer2: "u4" };
  it("allows moderator", () => {
    expect(canRecordOwnResult({ isModerator: true, session: baseSession, pairing, userId: "anyone" })).toBe(true);
  });
  it("allows player in pairing when own-result flag on", () => {
    expect(canRecordOwnResult({ isModerator: false, session: { ...baseSession, allowPlayerRecordOwnResult: true }, pairing, userId: "u1" })).toBe(true);
  });
  it("denies player not in pairing", () => {
    expect(canRecordOwnResult({ isModerator: false, session: { ...baseSession, allowPlayerRecordOwnResult: true }, pairing, userId: "u99" })).toBe(false);
  });
  it("allows player in pairing when any-result flag on", () => {
    expect(canRecordOwnResult({ isModerator: false, session: { ...baseSession, allowPlayerRecordAnyResult: true }, pairing, userId: "u2" })).toBe(true);
  });
});

describe("canRecordAnyResult", () => {
  it("allows moderator", () => {
    expect(canRecordAnyResult({ isModerator: true, session: baseSession })).toBe(true);
  });
  it("allows player when flag on", () => {
    expect(canRecordAnyResult({ isModerator: false, session: { ...baseSession, allowPlayerRecordAnyResult: true } })).toBe(true);
  });
  it("denies player when flag off", () => {
    expect(canRecordAnyResult({ isModerator: false, session: baseSession })).toBe(false);
  });
});
```

**Step 2:** Run tests to confirm they fail

```bash
cd web && npm test -- tests/unit/domain/permissions.test.ts
```

**Step 3:** Implement permissions

```typescript
// web/src/domain/policies/permissions.ts
interface SessionFlags {
  allowPlayerAssignEmptyCourt: boolean;
  allowPlayerRecordOwnResult: boolean;
  allowPlayerRecordAnyResult: boolean;
}

interface PairingPlayers {
  teamAPlayer1: string | null;
  teamAPlayer2: string | null;
  teamBPlayer1: string | null;
  teamBPlayer2: string | null;
}

export function canAssignCourt(ctx: { isModerator: boolean; session: SessionFlags }): boolean {
  return ctx.isModerator || ctx.session.allowPlayerAssignEmptyCourt;
}

export function canRecordAnyResult(ctx: { isModerator: boolean; session: SessionFlags }): boolean {
  return ctx.isModerator || ctx.session.allowPlayerRecordAnyResult;
}

export function canRecordOwnResult(ctx: {
  isModerator: boolean;
  session: SessionFlags;
  pairing: PairingPlayers;
  userId: string;
}): boolean {
  if (ctx.isModerator || ctx.session.allowPlayerRecordAnyResult) return true;
  if (!ctx.session.allowPlayerRecordOwnResult) return false;
  const { teamAPlayer1, teamAPlayer2, teamBPlayer1, teamBPlayer2 } = ctx.pairing;
  return [teamAPlayer1, teamAPlayer2, teamBPlayer1, teamBPlayer2].includes(ctx.userId);
}
```

**Step 4:** Run tests again

```bash
cd web && npm test -- tests/unit/domain/permissions.test.ts
```

Expected: all 8 passing

**Step 5:** Commit

```bash
git add -A && git commit -m "feat: add domain permission policies with tests"
```

---

### Task 3.2: Pairing algorithm

**Files:**
- Create: `web/src/domain/algorithms/pairing.ts`
- Create: `web/tests/unit/domain/pairing.test.ts`

**Step 1:** Write failing tests

```typescript
// web/tests/unit/domain/pairing.test.ts
import { describe, it, expect } from "vitest";
import { generatePairing, RULE_WEIGHTS, type PlayerStats } from "@/src/domain/algorithms/pairing";

function makePlayer(id: string, overrides: Partial<PlayerStats> = {}): PlayerStats {
  return {
    userId: id,
    skillLevel: 5,
    skillRating: 1000,
    matchesPlayed: 0,
    gamesSinceLastPlayed: 0,
    partnerHistory: {},
    opponentHistory: {},
    ...overrides,
  };
}

describe("generatePairing — basics", () => {
  it("returns null when fewer than 4 players available", () => {
    const result = generatePairing([makePlayer("1"), makePlayer("2"), makePlayer("3")]);
    expect(result).toBeNull();
  });

  it("returns a valid 4-player assignment with 2 teams of 2", () => {
    const players = [makePlayer("1"), makePlayer("2"), makePlayer("3"), makePlayer("4")];
    const result = generatePairing(players);
    expect(result).not.toBeNull();
    expect(result!.teamA).toHaveLength(2);
    expect(result!.teamB).toHaveLength(2);
    const allIds = [...result!.teamA, ...result!.teamB].map(p => p.userId);
    expect(new Set(allIds).size).toBe(4); // no duplicates
  });

  it("always assigns 4 distinct players even from a large pool", () => {
    const players = Array.from({ length: 16 }, (_, i) => makePlayer(String(i)));
    const result = generatePairing(players);
    expect(result).not.toBeNull();
    const allIds = [...result!.teamA, ...result!.teamB].map(p => p.userId);
    expect(new Set(allIds).size).toBe(4);
  });
});

describe("generatePairing — wait time fairness", () => {
  it("includes the longest-waiting player even when they're not the best skill match", () => {
    // p5 has been waiting 8 rounds — they must be in the game despite a slightly different rating.
    const players = [
      makePlayer("p1", { skillRating: 1000, gamesSinceLastPlayed: 1 }),
      makePlayer("p2", { skillRating: 1000, gamesSinceLastPlayed: 1 }),
      makePlayer("p3", { skillRating: 1000, gamesSinceLastPlayed: 1 }),
      makePlayer("p4", { skillRating: 1000, gamesSinceLastPlayed: 1 }),
      makePlayer("p5", { skillRating: 900,  gamesSinceLastPlayed: 8 }), // must play
    ];
    const result = generatePairing(players, "longest_wait");
    expect(result).not.toBeNull();
    const selectedIds = [...result!.teamA, ...result!.teamB].map(p => p.userId);
    expect(selectedIds).toContain("p5");
  });

  it("includes the player with fewest matches under least_played rule", () => {
    const players = [
      makePlayer("v1", { matchesPlayed: 10 }),
      makePlayer("v2", { matchesPlayed: 10 }),
      makePlayer("v3", { matchesPlayed: 10 }),
      makePlayer("v4", { matchesPlayed: 10 }),
      makePlayer("newbie", { matchesPlayed: 1 }), // must be included
    ];
    const result = generatePairing(players, "least_played");
    expect(result).not.toBeNull();
    const selectedIds = [...result!.teamA, ...result!.teamB].map(p => p.userId);
    expect(selectedIds).toContain("newbie");
  });
});

describe("generatePairing — skill balance", () => {
  it("splits strong and weak players across teams (never stacks them)", () => {
    // Best: (strong+weak) vs (strong+weak) = 2000 vs 2000
    // Worst: (strong+strong) vs (weak+weak) = 3000 vs 1000
    const players = [
      makePlayer("s1", { skillRating: 1500 }),
      makePlayer("s2", { skillRating: 1500 }),
      makePlayer("w1", { skillRating: 500 }),
      makePlayer("w2", { skillRating: 500 }),
    ];
    const result = generatePairing(players, "balanced");
    expect(result).not.toBeNull();
    const teamASum = result!.teamA.reduce((s, p) => s + p.skillRating, 0);
    const teamBSum = result!.teamB.reduce((s, p) => s + p.skillRating, 0);
    expect(Math.abs(teamASum - teamBSum)).toBe(0);
  });

  it("skill_matched rule picks the most balanced teams even when others have been waiting longer", () => {
    const players = [
      makePlayer("a", { skillRating: 1500, gamesSinceLastPlayed: 0 }),
      makePlayer("b", { skillRating: 1500, gamesSinceLastPlayed: 5 }),
      makePlayer("c", { skillRating: 500,  gamesSinceLastPlayed: 0 }),
      makePlayer("d", { skillRating: 500,  gamesSinceLastPlayed: 5 }),
    ];
    const result = generatePairing(players, "skill_matched");
    expect(result).not.toBeNull();
    const teamASum = result!.teamA.reduce((s, p) => s + p.skillRating, 0);
    const teamBSum = result!.teamB.reduce((s, p) => s + p.skillRating, 0);
    expect(Math.abs(teamASum - teamBSum)).toBe(0);
  });
});

describe("generatePairing — variety", () => {
  it("avoids re-pairing the same partners when alternatives exist", () => {
    // p1 and p2 have partnered twice already — they should be on opposite teams
    const players = [
      makePlayer("p1", { partnerHistory: { p2: 2 } }),
      makePlayer("p2", { partnerHistory: { p1: 2 } }),
      makePlayer("p3", {}),
      makePlayer("p4", {}),
    ];
    const result = generatePairing(players);
    expect(result).not.toBeNull();
    const teamAIds = result!.teamA.map(p => p.userId);
    const p1InA = teamAIds.includes("p1");
    const p2InA = teamAIds.includes("p2");
    expect(p1InA).not.toBe(p2InA); // one on each team
  });
});

describe("generatePairing — maxPartnerSkillLevelGap", () => {
  it("respects the skill gap constraint when satisfiable", () => {
    const players = [
      makePlayer("a", { skillLevel: 3 }),
      makePlayer("b", { skillLevel: 5 }),
      makePlayer("c", { skillLevel: 4 }),
      makePlayer("d", { skillLevel: 6 }),
    ];
    const result = generatePairing(players, "balanced", 2);
    expect(result).not.toBeNull();
    for (const [pa, pb] of [result!.teamA, result!.teamB]) {
      expect(Math.abs(pa.skillLevel - pb.skillLevel)).toBeLessThanOrEqual(2);
    }
  });

  it("relaxes the constraint gracefully when impossible to satisfy", () => {
    // Only 4 players available, all pairs violate gap=1. Must not return null.
    const players = [
      makePlayer("a", { skillLevel: 1 }),
      makePlayer("b", { skillLevel: 5 }),
      makePlayer("c", { skillLevel: 1 }),
      makePlayer("d", { skillLevel: 5 }),
    ];
    expect(generatePairing(players, "balanced", 1)).not.toBeNull();
  });
});

describe("RULE_WEIGHTS", () => {
  it("every rule profile's weights sum to exactly 1.0", () => {
    for (const [, w] of Object.entries(RULE_WEIGHTS)) {
      expect(w.wait + w.fairness + w.balance + w.variety).toBeCloseTo(1.0, 5);
    }
  });
});
```

**Step 2:** Run to confirm fail

```bash
cd web && npm test -- tests/unit/domain/pairing.test.ts
```

**Step 3:** Implement pairing algorithm

```typescript
// web/src/domain/algorithms/pairing.ts

export interface PlayerStats {
  userId: string;
  skillLevel: number;   // 1–10 coarse (used for partner-gap hard filter)
  skillRating: number;  // continuous TrueSkill-derived value; higher = stronger
  matchesPlayed: number;        // total games played this session
  gamesSinceLastPlayed: number; // rounds idle since last game (0 = just came off court)
  partnerHistory: Record<string, number>;  // partnerId → times partnered this session
  opponentHistory: Record<string, number>; // opponentId → times faced this session
}

export interface PairingResult {
  teamA: [PlayerStats, PlayerStats];
  teamB: [PlayerStats, PlayerStats];
  score: number; // 0–1; higher is better
}

/**
 * Weight profiles for each pairing rule.
 * All four weights in a profile must sum to 1.0.
 *
 *  wait:     reward including players sitting out the longest
 *  fairness: reward including players with fewer total games (equity)
 *  balance:  reward closely matched team skill totals
 *  variety:  penalise repeated partners / opponents
 */
export const RULE_WEIGHTS = {
  least_played:  { wait: 0.10, fairness: 0.50, balance: 0.25, variety: 0.15 },
  longest_wait:  { wait: 0.50, fairness: 0.15, balance: 0.20, variety: 0.15 },
  balanced:      { wait: 0.25, fairness: 0.25, balance: 0.30, variety: 0.20 },
  skill_matched: { wait: 0.10, fairness: 0.10, balance: 0.60, variety: 0.20 },
} as const;

export type PairingRule = keyof typeof RULE_WEIGHTS;

interface ScoringContext {
  maxWait: number;          // highest gamesSinceLastPlayed in the candidate pool
  maxMatchesPlayed: number; // highest matchesPlayed in the candidate pool
  maxRatingSpread: number;  // (maxRating - minRating) × 2 — realistic max team-sum gap
}

/**
 * Scores a proposed 4-player assignment on a 0–1 scale.
 *
 * Every signal is independently normalised to [0, 1] before weighting,
 * so changing one player's rating won't collapse the scoring of other
 * signals (the old bug: raw rating diffs in the thousands dominated everything).
 */
function scorePairing(
  a1: PlayerStats, a2: PlayerStats,
  b1: PlayerStats, b2: PlayerStats,
  weights: (typeof RULE_WEIGHTS)[PairingRule],
  ctx: ScoringContext,
): number {
  const players = [a1, a2, b1, b2];

  // 1. WAIT SCORE [0–1]
  // Exponential amplification: someone idle 5 rounds is much more frustrated
  // than someone idle 1 round. Math.pow(x, 1.5) keeps score in [0,1] while
  // making long waits disproportionately attractive.
  const waitScore = ctx.maxWait > 0
    ? players.reduce((s, p) =>
        s + Math.pow(p.gamesSinceLastPlayed / ctx.maxWait, 1.5), 0) / 4
    : 0;

  // 2. FAIRNESS SCORE [0–1]
  // Reward picking players who have played less overall. Inverted: lower total = higher score.
  const fairnessScore = ctx.maxMatchesPlayed > 0
    ? 1 - players.reduce((s, p) => s + p.matchesPlayed, 0) / (4 * ctx.maxMatchesPlayed)
    : 1;

  // 3. BALANCE SCORE [0–1]
  // Reward teams whose combined ratings are as close as possible.
  const teamAStr = a1.skillRating + a2.skillRating;
  const teamBStr = b1.skillRating + b2.skillRating;
  const balanceScore = 1 - Math.min(1, Math.abs(teamAStr - teamBStr) / ctx.maxRatingSpread);

  // 4. VARIETY SCORE [0–1]
  // Penalise repeated partners (weight ×2 — same partner is more annoying than same opponent)
  // and repeated opponents (weight ×1). Uses counts so 3rd repeat hurts more than 2nd.
  const partnerPenalty =
    (a1.partnerHistory[a2.userId] ?? 0) * 2 +
    (b1.partnerHistory[b2.userId] ?? 0) * 2;
  const opponentPenalty =
    (a1.opponentHistory[b1.userId] ?? 0) + (a1.opponentHistory[b2.userId] ?? 0) +
    (a2.opponentHistory[b1.userId] ?? 0) + (a2.opponentHistory[b2.userId] ?? 0);
  // Normalise: 8 "repeat units" drives score to 0 (very repetitive session)
  const varietyScore = Math.max(0, 1 - (partnerPenalty + opponentPenalty) / 8);

  return (
    weights.wait     * waitScore    +
    weights.fairness * fairnessScore +
    weights.balance  * balanceScore  +
    weights.variety  * varietyScore
  );
}

/**
 * Finds the highest-scoring 4-player assignment from the available pool.
 *
 * Design notes:
 * - Full enumeration (no candidateLimit pre-filter): the pre-sort + hard-cut
 *   anti-pattern would prevent the scorer from ever seeing player #N who could
 *   produce a much better balanced game. For badminton sessions (≤30 players
 *   bench at once), C(30,4)=27,405 × 3 splits ≈ 80k score calls — well under 5ms.
 * - Three team splits per combination: (12v34), (13v24), (14v23). The old code
 *   only tried 2, missing valid balanced configurations.
 * - maxPartnerSkillLevelGap is a hard filter applied per team. If no combination
 *   satisfies it (too strict for the pool), we retry without the constraint rather
 *   than returning null and leaving courts empty.
 */
export function generatePairing(
  availablePlayers: PlayerStats[],
  rule: PairingRule = "balanced",
  maxPartnerSkillLevelGap = 10,
  _enforcing = true, // internal flag for constraint-relaxation fallback
): PairingResult | null {
  if (availablePlayers.length < 4) return null;

  const weights = RULE_WEIGHTS[rule];

  // Compute normalisation context from the full pool
  const maxWait = Math.max(...availablePlayers.map(p => p.gamesSinceLastPlayed), 1);
  const maxMatchesPlayed = Math.max(...availablePlayers.map(p => p.matchesPlayed), 1);
  const ratings = availablePlayers.map(p => p.skillRating);
  // Max realistic team-sum gap = full rating range × 2 (one team gets best+worst)
  const maxRatingSpread = Math.max((Math.max(...ratings) - Math.min(...ratings)) * 2, 1);

  const ctx: ScoringContext = { maxWait, maxMatchesPlayed, maxRatingSpread };
  let best: PairingResult | null = null;

  const n = availablePlayers.length;
  for (let i = 0; i < n - 3; i++) {
    for (let j = i + 1; j < n - 2; j++) {
      for (let k = j + 1; k < n - 1; k++) {
        for (let l = k + 1; l < n; l++) {
          const [p1, p2, p3, p4] = [
            availablePlayers[i], availablePlayers[j],
            availablePlayers[k], availablePlayers[l],
          ];
          // All 3 distinct team splits for 4 players
          const splits: [PlayerStats, PlayerStats, PlayerStats, PlayerStats][] = [
            [p1, p2, p3, p4], // (1,2) vs (3,4)
            [p1, p3, p2, p4], // (1,3) vs (2,4)
            [p1, p4, p2, p3], // (1,4) vs (2,3)
          ];
          for (const [a1, a2, b1, b2] of splits) {
            // Hard filter: enforce maxPartnerSkillLevelGap when still in enforcing mode
            if (_enforcing) {
              if (Math.abs(a1.skillLevel - a2.skillLevel) > maxPartnerSkillLevelGap) continue;
              if (Math.abs(b1.skillLevel - b2.skillLevel) > maxPartnerSkillLevelGap) continue;
            }
            const score = scorePairing(a1, a2, b1, b2, weights, ctx);
            if (!best || score > best.score) {
              best = { teamA: [a1, a2], teamB: [b1, b2], score };
            }
          }
        }
      }
    }
  }

  // If the skill-gap constraint made it impossible, retry without it
  // (empty courts are worse than a slightly mismatched pairing)
  if (!best && _enforcing) {
    return generatePairing(availablePlayers, rule, maxPartnerSkillLevelGap, false);
  }

  return best;
}
```

**Step 4:** Run tests

```bash
cd web && npm test -- tests/unit/domain/pairing.test.ts
```

Expected: 12 passing

**Step 5:** Commit

```bash
git add -A && git commit -m "feat: add pairing algorithm with comprehensive tests"
```

---

## Phase 4: API Routes

### Task 4.1: Auth middleware helper

**Files:**
- Create: `web/src/infrastructure/auth/require-auth.ts`

**Step 1:** Create middleware helper for API routes

```typescript
// web/src/infrastructure/auth/require-auth.ts
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME, SessionPayload } from "./session";

export async function requireAuth(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
```

**Step 2:** Commit

```bash
git add -A && git commit -m "feat: add requireAuth helper for API routes"
```

---

### Task 4.2: Sessions API routes

**Files:**
- Create: `web/app/api/sessions/route.ts` (GET list, POST create)
- Create: `web/app/api/sessions/[sessionId]/route.ts` (GET detail)
- Create: `web/app/api/sessions/[sessionId]/players/route.ts` (GET, POST join)

**Step 1:** Create sessions list + create route

```typescript
// web/app/api/sessions/route.ts
import { NextRequest } from "next/server";
import { requireAuth } from "@/src/infrastructure/auth/require-auth";
import { createAdminClient } from "@/src/infrastructure/db/supabase-admin";
import { apiSuccess, apiError } from "@/src/lib/api-response";
import { generateRequestId } from "@/src/lib/request-id";
import { z } from "zod";

const CreateSessionSchema = z.object({
  name: z.string().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  location: z.string().optional(),
  numCourts: z.number().int().min(1).max(20),
  maxPlayers: z.number().int().min(2).max(100),
  notes: z.string().optional(),
  courtNames: z.record(z.string()).optional(),
  allowPlayerAssignEmptyCourt: z.boolean().optional(),
  allowPlayerRecordOwnResult: z.boolean().optional(),
  allowPlayerRecordAnyResult: z.boolean().optional(),
  allowPlayerAddRemoveCourts: z.boolean().optional(),
  allowPlayerAccessInviteQr: z.boolean().optional(),
  showSkillLevelPills: z.boolean().optional(),
  pairingRule: z.enum(["least_played", "longest_wait", "balanced"]).optional(),
  maxPartnerSkillLevelGap: z.number().int().min(1).max(10).optional(),
  status: z.enum(["draft", "active"]).optional(),
});

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await requireAuth();
  if (!session) return apiError("UNAUTHORIZED", "Not authenticated", requestId, 401);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .order("date", { ascending: false })
    .order("start_time", { ascending: false });

  if (error) return apiError("INTERNAL_ERROR", error.message, requestId, 500);
  return apiSuccess(data, requestId);
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const session = await requireAuth();
  if (!session) return apiError("UNAUTHORIZED", "Not authenticated", requestId, 401);
  if (!session.isModerator) return apiError("FORBIDDEN", "Moderators only", requestId, 403);

  const body = await req.json();
  const parsed = CreateSessionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid input", requestId, 400, { issues: parsed.error.issues });
  }

  const d = parsed.data;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      name: d.name,
      date: d.date,
      start_time: d.startTime,
      end_time: d.endTime,
      location: d.location ?? null,
      num_courts: d.numCourts,
      max_players: d.maxPlayers,
      notes: d.notes ?? null,
      court_names: d.courtNames ?? {},
      status: d.status ?? "draft",
      created_by: session.userId,
      allow_player_assign_empty_court: d.allowPlayerAssignEmptyCourt ?? false,
      allow_player_record_own_result: d.allowPlayerRecordOwnResult ?? false,
      allow_player_record_any_result: d.allowPlayerRecordAnyResult ?? false,
      allow_player_add_remove_courts: d.allowPlayerAddRemoveCourts ?? false,
      allow_player_access_invite_qr: d.allowPlayerAccessInviteQr ?? false,
      show_skill_level_pills: d.showSkillLevelPills ?? true,
      pairing_rule: d.pairingRule ?? "least_played",
      max_partner_skill_level_gap: d.maxPartnerSkillLevelGap ?? 2,
    })
    .select("*")
    .single();

  if (error) return apiError("INTERNAL_ERROR", error.message, requestId, 500);
  return apiSuccess(data, requestId, 201);
}
```

**Step 2:** Create session detail route (GET, PATCH status, DELETE)

**Step 3:** Create session players route (GET list, POST join)

**Step 4:** Commit

```bash
git add -A && git commit -m "feat: add sessions and session-players API routes"
```

---

### Task 4.3: Pairings API routes

**Files:**
- Create: `web/app/api/sessions/[sessionId]/pairings/route.ts`
- Create: `web/app/api/pairings/[pairingId]/route.ts` (status updates)
- Create: `web/app/api/pairings/[pairingId]/results/route.ts`

**Step 1:** Create pairings route (GET list + POST auto/manual)

The POST handler uses the `generatePairing` algorithm for `mode: "auto"`.

**Step 2:** Create pairing status update route (PATCH: start, complete, void)

**Step 3:** Create result recording route

**Step 4:** Commit

```bash
git add -A && git commit -m "feat: add pairings and game results API routes"
```

---

## Phase 5: Moderator UI

### Task 5.1: Sessions list page

**Files:**
- Create: `web/app/sessions/page.tsx`
- Create: `web/app/sessions/SessionCard.tsx`
- Create: `web/app/sessions/SessionCardSkeleton.tsx`

**Step 1:** Build the sessions list with loading skeleton (required by `loading-states` rule)

The page fetches `/api/sessions` and renders a card grid. While loading, shows 3 skeleton cards.

**Step 2:** Add navigation link to layout header

**Step 3:** Commit

```bash
git add -A && git commit -m "feat: add sessions list page with skeleton loading"
```

---

### Task 5.2: Create session form

**Files:**
- Create: `web/app/sessions/new/page.tsx`
- Create: `web/app/sessions/new/CreateSessionForm.tsx`

**Step 1:** Prefill form from moderator default settings (if available)

**Step 2:** Form uses shadcn Input, Label, Select, Switch, Button components

**Step 3:** POST to `/api/sessions` on submit; redirect to court dashboard on success

**Step 4:** Commit

```bash
git add -A && git commit -m "feat: add create session form with moderator defaults"
```

---

### Task 5.3: Court dashboard (live, with Realtime)

**Files:**
- Create: `web/app/sessions/[sessionId]/page.tsx`
- Create: `web/app/sessions/[sessionId]/CourtDashboard.tsx`
- Create: `web/app/sessions/[sessionId]/CourtCard.tsx`
- Create: `web/app/sessions/[sessionId]/PlayerList.tsx`

**Step 1:** Load session + pairings + players from API

**Step 2:** Subscribe to Supabase Realtime channel for the session (pairings + game_results changes)

**Step 3:** CourtCard shows current pairing, team names, status; moderator actions (generate pairing, start, void, record result)

**Step 4:** Unsubscribe on unmount

**Step 5:** Commit

```bash
git add -A && git commit -m "feat: add court dashboard with Supabase Realtime"
```

---

## Phase 6: Player UI

### Task 6.1: Join session + player view

**Files:**
- Create: `web/app/join/[sessionId]/page.tsx`
- Create: `web/app/sessions/[sessionId]/player/page.tsx`

**Step 1:** Join page: POST to `/api/sessions/:id/players`, redirect to player view

**Step 2:** Player view: shows "My next match" (court + teammates/opponents), recent matches, idle/playing status

**Step 3:** Subscribe to Realtime for live match updates

**Step 4:** Commit

```bash
git add -A && git commit -m "feat: add player join and match view with Realtime"
```

---

## Phase 7: Docs & OpenAPI

### Task 7.1: Architecture docs

**Files:**
- Create: `docs/ARCHITECTURE.md`
- Create: `docs/DEBUGGING.md`
- Create: `docs/RLS.md`
- Create: `web/config/openapi.yaml`

**Step 1:** Write ARCHITECTURE.md — entity diagram, layer overview, data flow

**Step 2:** Write DEBUGGING.md — requestId tracing workflow, log filter examples, test-based debugging

**Step 3:** Write RLS.md — document current RLS policies per table

**Step 4:** Write OpenAPI spec for all routes

**Step 5:** Commit

```bash
git add -A && git commit -m "docs: add ARCHITECTURE, DEBUGGING, RLS, and OpenAPI spec"
```

---

## Execution Order Summary

| Phase | Tasks | Est. effort |
|---|---|---|
| 1. Foundation | 1.1–1.5 | ~2 hours |
| 2. Auth | 2.1–2.3 | ~1.5 hours |
| 3. Domain logic | 3.1–3.2 | ~1 hour |
| 4. API routes | 4.1–4.3 | ~2 hours |
| 5. Moderator UI | 5.1–5.3 | ~3 hours |
| 6. Player UI | 6.1 | ~1.5 hours |
| 7. Docs | 7.1 | ~1 hour |

**Total estimated: ~12 hours of focused agent work**

---

## Pre-deployment checklist

- [ ] `npm run lint` passes in `web/`
- [ ] All unit tests pass
- [ ] `npm run build` succeeds
- [ ] Line OAuth redirect URI matches `NEXT_PUBLIC_LINE_CALLBACK_URL`
- [ ] `AUTH_SECRET` set in Vercel env vars
- [ ] Supabase RLS policies verified
- [ ] Smoke test: login → create session → court dashboard loads
