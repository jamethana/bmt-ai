---
name: vercel-mcp
description: Use Vercel MCP tools for deployment status, logs, and deploys. Use when checking deployment status, build/runtime logs, deploying, or when the user asks about Vercel deployments, builds, or production issues.
---

# Vercel MCP

Use the **Vercel MCP** for deployment status and logs instead of the CLI. Call tools via `call_mcp_tool` with `server: "project-0-badminton-pairing-v2-vercel"`.

## This repository’s Vercel project

- **Dashboard**: [jamethana-bmt](https://vercel.com/jamethanas-projects/jamethana-bmt)
- **Team slug** (use as `teamId`): `jamethanas-projects`
- **Project slug** (use as `projectId`): `jamethana-bmt`

For tools that require `teamId` and `projectId`, use these slugs unless `.vercel/project.json` or MCP discovery returns different values.

## Resolving teamId and projectId

Most tools need `teamId` and often `projectId`. Resolve them in this order:

1. **This repo**: Use `teamId: "jamethanas-projects"`, `projectId: "jamethana-bmt"` (see above).
2. **From repo**: Read `.vercel/project.json` if present for `projectId` and `orgId` (as `teamId`). The folder is gitignored; it exists after `vercel link`.
3. **From MCP**: Call `list_teams` (no args), then `list_projects` with `teamId` to get project IDs.

IDs: project IDs start with `prj_`, team IDs with `team_`. Slugs can be used in place of IDs.

## Tools (server: `project-0-badminton-pairing-v2-vercel`)

| Tool | Purpose | Required args |
|------|--------|----------------|
| `list_teams` | Get team IDs/slugs | — |
| `list_projects` | List projects (max 50) | `teamId` |
| `get_project` | Project details | `projectId`, `teamId` |
| `list_deployments` | Deployments for a project | `projectId`, `teamId` |
| `get_deployment` | One deployment by ID or URL | `idOrUrl`, `teamId` |
| `get_deployment_build_logs` | Build logs (e.g. failed build) | `idOrUrl`, `teamId` |
| `get_runtime_logs` | Runtime logs (serverless/edge) | `projectId`, `teamId` |
| `deploy_to_vercel` | Deploy current project | — |
| `search_vercel_documentation` | Search Vercel docs | `topic` |
| `web_fetch_vercel_url` | Fetch deployment URL (auth’d) | `url` |
| `get_access_to_vercel_url` | Temp shareable link for protected URL | `url` |
| `check_domain_availability_and_price` | Domain availability/pricing | `names` (array) |

Optional args (common): `list_deployments`: `since`, `until`; `get_deployment_build_logs`: `limit` (default 100); `get_runtime_logs`: `deploymentId`, `environment`, `level`, `since`, `until`, `limit`, `query`.

## Workflows

**Quick status**  
Use the `quick_status` prompt if the MCP exposes it, or: get `teamId`/`projectId` (from `.vercel/project.json` or list_teams → list_projects), then `list_deployments` with that project.

**Failed build**  
`get_deployment` with deployment ID or URL → `get_deployment_build_logs` with same `idOrUrl` and `teamId`.

**Runtime errors / logs**  
`get_runtime_logs` with `projectId`, `teamId`. Optionally set `level: ["error","fatal"]`, `environment: "production"`, `since: "1h"`.

**Deploy**  
`deploy_to_vercel` (no args; deploys current project).

**Protected preview URL**  
Use `get_access_to_vercel_url` with the deployment URL to get a temporary shareable link, or `web_fetch_vercel_url` to fetch content with auth.

**Vercel docs**  
`search_vercel_documentation` with `topic` (e.g. `"routing"`, `"data-fetching"`). Optional `tokens` (default 2500).

## Call pattern

Always check the tool schema in `mcps/project-0-badminton-pairing-v2-vercel/tools/<tool-name>.json` before calling if parameters are unclear. Use `call_mcp_tool` with:

- `server`: `"project-0-badminton-pairing-v2-vercel"`
- `toolName`: exact tool name (e.g. `list_deployments`)
- `arguments`: object with required (and any optional) parameters
