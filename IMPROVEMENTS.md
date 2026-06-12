# ServiceNow MCP Server — Review & Improvement Plan

> **North star:** evolve this server from a Table-API **data-plane** tool into a
> **config-as-code control plane** built around the **ServiceNow SDK + Fluent**,
> so an agent can author, build, and deploy instance configuration as TypeScript
> — not just read and write records.

_Last reviewed: 2026-06-12_

---

## 1. What the server is today

A clean, well-structured TypeScript MCP server exposing **33 tools** and **2 resources**.

| Aspect | Current state |
|---|---|
| MCP SDK | `@modelcontextprotocol/sdk ^1.0.4` (stdio transport) |
| HTTP | Axios `^1.7.9`, base URL `{instance}/api/now` |
| Validation | Zod `^3.25.1` |
| Auth | **Basic only** (`username:password` base64) |
| Config | `SERVICENOW_INSTANCE`, `SERVICENOW_USERNAME`, `SERVICENOW_PASSWORD`, `NAME` |
| Tests | none |

### API surface in use
Almost entirely the **Table API**, plus a few specialty endpoints:

| Capability | Endpoint(s) |
|---|---|
| CRUD / query / batch | `/api/now/table/{table}` (GET/POST/PATCH/DELETE) |
| Counting / aggregate | `/api/now/stats/{table}` |
| Server-side script | `/api/now/scripting/executeScript` |
| CMDB identify/reconcile | `/api/now/identifyreconcile` |

**Gap:** every tool operates on *records*. None of them *configure the instance* —
no app install, plugin activation, metadata deploy, update-set, or scan. That is a
**control-plane** job, and it's exactly where config-as-code lives.

---

## 2. The config-as-code stack (target architecture)

### A. ServiceNow SDK + Fluent — the authoring layer (PRIMARY)
- **Fluent** is a TypeScript DSL that maps typed API functions to platform records
  (Business Rules, Tables, ACLs, Forms, Script Includes, Inbound Email Actions,
  AiAgent/AgenticWorkflow, …). You write configuration as code.
- **`@servicenow/sdk`** (`now-sdk` CLI, latest ~4.7.0, May 2026) compiles Fluent →
  metadata XML and deploys it. It is to platform metadata what `tsc` is to JS.
- Typical CLI lifecycle (shell out from MCP tools):
  - `now-sdk init` — scaffold an app project
  - `now-sdk auth --add <instance>` — register an instance + OAuth credential
  - `now-sdk build` — compile Fluent → metadata package
  - `now-sdk install` — deploy the built package to the instance
  - `now-sdk transform` — reverse-engineer existing app XML → Fluent TypeScript
  - `now-sdk dependencies` — manage app/plugin dependencies
- Refs: [github.com/ServiceNow/sdk](https://github.com/ServiceNow/sdk) ·
  [SDK API reference](https://servicenow.github.io/sdk/) ·
  [Fluent API reference](https://www.servicenow.com/docs/bundle/yokohama-application-development/page/build/servicenow-sdk/reference/servicenow-fluent-api-reference.html)

### B. CI/CD API (`/api/sn_cicd/*`) — the deploy/lifecycle layer
The REST surface for the lifecycle *around* a Fluent app (deps, promotion, gating).
All calls are async → return a `progress_id` you poll. Confirmed endpoint families
([CI/CD API ref](https://www.servicenow.com/docs/bundle/yokohama-api-reference/page/integrate/inbound-rest/concept/cicd-api.html)):

| Operation | Endpoint |
|---|---|
| Activate / rollback plugin | `POST /api/sn_cicd/plugin/{id}/activate` · `.../rollback` |
| Install / publish / rollback app | `POST /api/sn_cicd/app_repo/install` · `/publish` · `/rollback` |
| Batch install / rollback | `POST /api/sn_cicd/app/batch/install` · `.../batch/rollback/{rollback_id}` |
| Update sets | `POST /api/sn_cicd/update_set/retrieve \| preview/{id} \| commit/{id} \| back_out/{id}` |
| Source control | `POST /api/sn_cicd/sc/apply_changes` · `/import` |
| Instance scan (compliance) | `POST /api/sn_cicd/instance_scan/full_scan \| point_scan \| suite_scan/{id}` |
| ATF test suite | `POST /api/sn_cicd/testsuite/run` |
| Progress poll | `GET /api/sn_cicd/progress/{id}` |

### C. Other modern REST surfaces (supporting)
- **Batch API** `POST /api/now/v1/batch` — many REST calls in one round-trip
  (replaces the current `Promise.all` of N HTTP calls).
- **Import Set API** `POST /api/now/import/{staging_table}` — proper data-load path.
- **Attachment API** `/api/now/attachment` — no file support today.
- **GraphQL** `/api/now/graphql` — nested fetch in one call.

---

## 3. Cross-cutting weaknesses to fix first

1. **Basic auth only** — OAuth 2.0 (client credentials / refresh token) is required
   by the SDK `auth` flow and CI/CD operations, and is the production standard.
   **Highest-value foundational fix.**
2. **No async/progress handling** — CI/CD + SDK installs are long-running and polled;
   the client has no `pollProgress()` primitive.
3. **Batch tools do N parallel HTTP calls** instead of the native Batch API.
4. **No retry / 429 backoff** in the Axios layer.
5. **`execute_script` / `bulk_delete_records`** do work via raw server-side script that
   dedicated APIs do more safely — fine for war-room, risky as a default.
6. **Stale MCP SDK (`^1.0.4`)** — newer releases add `registerTool`, structured content,
   better typing. **No tests** in the repo.

---

## 4. Prioritized improvements

**Tier 1 — Foundation (unblocks everything)**
1. OAuth 2.0 auth alongside Basic (`auth.ts` + config).
2. Async progress poller in the client (`GET /progress/{id}`, timeout/backoff).
3. Retry + 429 backoff in the Axios layer.

**Tier 2 — Config-as-code core (the north star)**
4. `now-sdk` wrapper: `scaffold_app` (init), `build_app` (build), `deploy_app` (install).
5. `transform_to_fluent` — turn existing app XML into Fluent TypeScript.
6. Fluent artifact generators — agent-friendly tools that emit Fluent for common
   record types (table, business rule, ACL, script include, form).
7. Managed **instance auth profiles** (`now-sdk auth`) so deploys target dev/test/prod.

**Tier 3 — Deploy lifecycle (CI/CD API)**
8. `activate_plugin` / `rollback_plugin` (Fluent apps declare plugin deps).
9. `install_application` / `publish_application` / `batch_install` / `batch_rollback`.
10. `update_set_retrieve | preview | commit | back_out`.
11. `run_instance_scan` (compliance) + `run_test_suite` (ATF) as deploy gates.

**Tier 4 — Efficiency / breadth**
12. Replace home-grown batch with native **Batch API** (`/v1/batch`).
13. **Import Set** + **Attachment** tools; optional **GraphQL** query tool.

**Tier 5 — Hygiene**
14. Bump `@modelcontextprotocol/sdk`; migrate to `registerTool` + structured output.
15. Test suite (mock Axios) + CI.
16. Extend `PERMISSIONS.md` with least-privilege roles for SDK/CI-CD
    (`sn_cicd.*`, deploy/admin roles for the integration user).

---

## 5. Implementation plan (phased)

- **Phase 0 — Foundation (Tier 1).** Add `SERVICENOW_AUTH_TYPE` + OAuth vars to
  `config.ts`; add `OAuthProvider` (token cache/refresh) in `auth.ts`; add
  `client.pollProgress(id, opts)` and a retry interceptor. No new tools yet —
  de-risks all later work.

- **Phase 1 — Config-as-code core (Tier 2).** New `src/servicenow/sdk-runner.ts`
  that shells out to `now-sdk` (project workspace mgmt, build artifacts, install).
  Add tools 4–7 mirroring the existing `xTool` schema + `executeX` pattern; register
  in `tools/index.ts` and `index.ts`. Manage instance auth profiles so a deploy can
  target a named environment.

- **Phase 2 — Deploy lifecycle (Tier 3).** New `src/servicenow/cicd-client.ts`
  wrapping `/api/sn_cicd/*` + the Phase 0 poller. Add tools 8–11; each returns the
  final polled result, not just the kickoff. Wire scan/test as optional gates before
  `commit`/`install`.

- **Phase 3 — Efficiency/breadth (Tier 4).** Refactor batch onto `/v1/batch`;
  add Import Set, Attachment, and optional GraphQL tools.

- **Phase 4 — Hygiene (Tier 5).** SDK bump + `registerTool` migration, tests, CI,
  role/permission docs.

---

## 6. Open questions / decisions

- **SDK execution model:** does the MCP server run `now-sdk` locally (Node child
  process — needs the CLI installed in the server env) or target a remote build
  service? Local child-process is simplest and matches the SDK's design.
- **Workspace persistence:** where do scaffolded Fluent projects live between tool
  calls? (e.g. a configurable `WORKSPACE_DIR`.)
- **Guardrails:** deploys to prod should require an explicit confirmation flag and
  ideally a passing instance scan / ATF suite.
