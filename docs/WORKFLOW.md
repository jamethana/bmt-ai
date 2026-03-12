# AI-First Development Workflow

> This document codifies how development works in this repo. The AI agent follows this automatically via `.cursor/rules/ai-first-workflow.mdc`.

---

## Overview

| Role | Responsibility |
|---|---|
| **You (product owner)** | Describe outcomes, approve designs, pick between options, say when to deploy |
| **AI** | Design, code, test, validate, debug, and deploy |

---

## Feature lifecycle

```
You describe feature
     │
     ▼
AI brainstorms → proposes 2–3 approaches
     │
You pick / approve
     │
     ▼
AI writes design doc (docs/plans/YYYY-MM-DD-<feature>-design.md)
     │
AI derives implementation plan → you say "go ahead"
     │
     ▼
AI builds code (rules + skills active)
     │
     ▼
AI validates locally (browser-tester, ux-reviewer)
     │
     ▼
AI runs lint + tests
     │
     ▼
You say "deploy"
     │
     ▼
AI: pre-deploy checks → deploy_to_vercel (project bmt) → monitor build → post-deploy smoke check
```

---

## How to start a feature

Say what you want in plain language, optionally tagging:

- `/brainstorming` — AI walks through options before writing any code
- `/brainstorming /ui-ux-pro-max` — for UX-heavy features, extra design rigour

Examples:
- "Add a sessions list for moderators. Show today's sessions with status and player count."
- "Implement the court dashboard for a live session, optimised for phones on court."

---

## Your role in practice

You provide:
- **Outcomes and constraints** ("must work on low-bandwidth court Wi-Fi")
- **Domain decisions** ("should players be able to edit any result or only their own?")
- **Design approval** (or feedback on AI's proposal)
- **Deploy trigger** ("deploy" or "ship to production")

You do not need to:
- Run terminal commands
- Navigate the Vercel dashboard
- Manually test in the browser
- Read every diff (though you always can)

---

## AI tooling used per phase

| Phase | Tools / subagents |
|---|---|
| Design & brainstorming | `brainstorming` skill, `docs/DESIGN.md` |
| Coding | Cursor rules: `loading-states`, `realtime-patterns`, `auth-error-handling`, `api-response-shape` |
| UI patterns | Skills: `react-best-practices`, `composition-patterns`, `ui-ux-pro-max` |
| Auth | Skill: `line-auth-supabase`, subagent: `auth-debugger` |
| Realtime | Skill: `supabase-realtime` |
| Browser validation | Subagent: `browser-tester` |
| UX review | Subagent: `ux-reviewer` |
| DB / migrations | Supabase MCP + skill: `supabase-postgres-best-practices` |
| Deploy & logs | Vercel MCP (project `bmt`, team `jamethanas-projects`) |

---

## Vercel deployment

AI uses the **Vercel MCP** — no manual dashboard steps needed.

| Action | What AI does |
|---|---|
| Deploy | `deploy_to_vercel` |
| Check build | `list_deployments` → `get_deployment_build_logs` |
| Check runtime errors | `get_runtime_logs` (level: error/fatal) |
| Fetch production URL | `web_fetch_vercel_url` |

AI always runs lint + tests before deploying.

---

## Supabase / database

- AI inspects tables and RLS via Supabase MCP (read-only by default).
- Schema changes: AI proposes SQL migrations in a design doc, waits for your approval, then applies.
- Destructive operations (drops, backfills): always explicit user approval required.

---

## Guardrails

These are automatic — built into Cursor rules:

| Problem (previous app) | Guardrail |
|---|---|
| Missing skeleton loading | `loading-states.mdc` enforces `<Skeleton>` on all async components |
| Multi-user sync broken | `realtime-patterns.mdc` enforces Supabase Realtime subscriptions |
| Auth bugs | `auth-error-handling.mdc` documents and enforces Line→Supabase flow |
| Inconsistent API errors | `api-response-shape.mdc` enforces `{ data/error, requestId }` shape |

---

## Escape hatches

You can always say:

- "Stop and show me the diff for X."
- "Don't deploy, just commit and let me review."
- "Roll back the last change."
- "Skip brainstorming for this small fix."
