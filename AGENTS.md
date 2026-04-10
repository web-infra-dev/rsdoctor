# AGENTS.md

## Stack

- Node.js `22+`, package manager **pnpm `10.17+`** (enable via `corepack enable`)
- `pnpm` workspace + `Nx` monorepo (build caching + topological ordering)
- TypeScript strict mode; target `node 16` for library output
- Build toolchain: **Rslib** (based on Rsbuild/Rspack)
- Lint: **Biome** (`pnpm lint`), format: **Prettier** (`pnpm format`)
- Test runner: **Rstest** (`pnpm test`), E2E: **Playwright** (`pnpm e2e`)
- Versioning: **Changesets** (`pnpm changeset`)

## Commands

```bash
# ── bootstrap ────────────────────────────────────────────────
pnpm install                # install all deps + build all packages (prepare hook)

# ── quality checks ───────────────────────────────────────────
pnpm lint                   # biome lint (error-level only)
pnpm format                 # prettier + heading-case
pnpm test                   # unit tests via rstest (single worker, NODE_OPTIONS=--max-old-space-size=8192)
pnpm e2e                    # playwright e2e (requires chromium: cd e2e && npx playwright install chromium)

# ── build ────────────────────────────────────────────────────
pnpm run build              # nx run-many: build all @rsdoctor/* packages in parallel
npx nx build @rsdoctor/core # build a single package (respects dependsOn)

# ── focused dev ──────────────────────────────────────────────
pnpm --filter @rsdoctor/core run build     # build one package
pnpm --filter @rsdoctor/core run test      # test one package
pnpm -C packages/components test           # alternative: use directory path

# ── changeset / release ──────────────────────────────────────
pnpm changeset              # create a changeset for your changes
pnpm bump                   # apply changesets to bump versions
```

## Project structure

```text
packages/
  types/              # shared TypeScript type definitions
  utils/              # shared utilities (build / common / error / logger / ruleUtils)
  graph/              # module / chunk / package graph data structures
  sdk/                # server SDK: data collection, socket.io transport, report serving
  core/               # core analysis engine: build-utils, plugins, rules
  rspack-plugin/      # Rspack plugin (peerDep: @rspack/core)
  webpack-plugin/     # Webpack 5 plugin (peerDep: webpack 5.x)
  cli/                # `rsdoctor` CLI binary
  ai/                 # `@rsdoctor/mcp-server` — MCP server + AI analysis (published as @rsdoctor/mcp-server)
  client/             # web client (Rsbuild SPA, serves analysis report)
  components/         # shared React UI components (antd + echarts)
  document/           # documentation site (Rspress)
  proto/              # protocol buffer / schema definitions
  test-helper/        # test utilities shared across packages
  agent-cli/          # agent CLI tooling (docs only)
scripts/
  rslib.base.config.ts  # shared Rslib build config (CJS + ESM dual-package)
  rstest.setup.ts       # rstest global setup (snapshot serializer)
  tsconfig/             # shared tsconfig presets
e2e/                    # Playwright E2E tests (cases/ per bundler)
examples/               # runnable example projects (rspack / rsbuild / webpack / rspress)
```

### Package dependency flow

```text
types → utils → graph → sdk → core → rspack-plugin / webpack-plugin → cli
                                  ↘ client ← components
                                  ↘ ai (mcp-server)
```

## Build system

- Each package has its own `rslib.config.ts` that typically extends `scripts/rslib.base.config.ts`.

## Code style

- **Quotes**: single quotes everywhere; Prettier enforces formatting.
- **Naming**: `camelCase` for functions, variables, and file names; `PascalCase` for types, classes, interfaces, and enums.
- **Imports**: Biome auto-organizes imports; use `import type` for type-only imports.
- **No default exports** in library packages unless re-exporting a config.
- Keep files focused; split large modules into sub-directories.

## Testing

- Unit tests live in `<package>/tests/` (file pattern: `*.test.ts`).
- Rstest config: `rstest.config.ts` at repo root. Tests run with `maxWorkers: 1` (build-heavy tests are flaky in parallel).
- Snapshot serializer normalizes workspace paths (see `scripts/rstest.setup.ts`).
- `packages/ai/` tests are excluded from the root test run and should be run separately.
- E2E tests use Playwright; cases are organized per bundler under `e2e/cases/`.

## CI

- **Test (Ubuntu)**: Node 22.x on ubuntu-22.04, runs `pnpm run test:all` (unit + e2e).
- **Test (Windows)**: same matrix on windows.
- **Lint**: separate workflow runs `biome lint`.
- PRs targeting `main`, `release_*`, `release-*` trigger CI.
- Paths `document/**` and `*.md` are excluded from test CI triggers.

## Pull request conventions

- Branch off `main`; never commit directly to `main`.
- PR title must follow **Conventional Commits**: `type(scope): description`.
- Common scopes: `core`, `rspack-plugin`, `webpack-plugin`, `sdk`, `cli`, `ai`, `graph`, `utils`, `components`, `client`, `deps`.
- PR body must follow `.github/PULL_REQUEST_TEMPLATE.md` with two sections:
  - `## Summary` — what changed and why.
  - `## Related Links` — issue links, docs, related PRs, or `None`.
- Add a **changeset** (`pnpm changeset`) for user-facing changes before opening the PR.

## Conventions for AI agents

- Always run `pnpm install` first if `node_modules/` is missing.
- Before editing, build the target package to ensure the baseline is green.
- After making changes, run `pnpm --filter <pkg> run test` to validate.
- When fixing a bug, add or update a test case in `<package>/tests/`.
- Do not modify generated files under `dist/`, `compiled/`, or `node_modules/`.
- Do not modify `pnpm-lock.yaml` manually — run `pnpm install` to regenerate.
- Respect existing file structure; do not flatten sub-directories without reason.
- When creating new exports, update the `exports` field in `package.json` and ensure both CJS and ESM entries exist.
