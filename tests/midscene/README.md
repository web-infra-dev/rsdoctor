# Midscene AI E2E

Inspect asset modules, filter assets and modules in both input orders, search modules,
switch compiler environments, inspect rule results, open bundle comparison, and upload
a real build manifest. The fixture uses the checked-out Rsdoctor plugins and native reports.

`migration-inventory.json` records all 28 original E2E cases and their migration
decisions. Original compiler-data and controlled-clock assertions remain unchanged.
Bundle comparison verifies only the original overview and tab entries; the separate
Assets activation stall and model-free reproducer are documented in [known issues](KNOWN-ISSUES.md).

The first replacement batch removes the four ordinary unit-first/value-first
filter tests, now covered by BUNDLE-02 through BUNDLE-05. The two pending-input
tests retain their controlled 300 ms debounce contract. Bundle Diff UI checks
move to DIFF-01; its remaining legacy test verifies CLI startup and the manifest
endpoint without browser interaction. Brief-report, rule, and uploader tests no
longer duplicate visual outcomes: they retain document metadata, ARIA attributes,
exact responsive geometry, and parsed client-state contracts. The compiler-series
test remains a deterministic HTML/JSON build-output test, not a visual UI flow.
The inventory records the original 28 tests; 24 legacy tests remain after the
four replacements, including the split technical contracts.
Remaining deterministic tests run through `pnpm e2e`; Ubuntu CI includes them in
`pnpm test:all`. Windows currently runs unit tests only. Removed source remains
recoverable at the inventory's `sourceCommit`; no replacement uses `skip`.

This isolated npm package uses
`@midscene/test` 1.16.5, not Vitest. Each case starts in a fresh browser context.
`app.open` only prepares the browser; all product interactions use `aiAct`.
Separate `aiAssert` steps check outcomes instead of treating an AI action's completion
as proof of success. Browser requests stay on the local fixture origin.

## Run locally

Use Node.js 24 and the repository's pinned pnpm version.

```sh
corepack enable
pnpm install --frozen-lockfile
cd tests/midscene
npm ci
npx playwright install chromium
cp .env.example .env
```

Fill in the four model variables in `.env` with a vision-capable model.
Keep credentials out of Git. Environment variables override `.env`; unset inherited
`MIDSCENE_*` configuration when testing a different provider.

The framework setup starts the synthetic fixture and tears down its owned process
after the run. An already-running local fixture can be reused.

Run the suite:

```sh
cd tests/midscene
npm run check:model
npm test
```

The fixture listens on `http://127.0.0.1:4174`. Set
`MIDSCENE_INCLUDE_TAGS=search` (Rspress) or `MIDSCENE_INCLUDE_TAGS=assets`
(Rsdoctor) to run one flow. Retries are disabled so the first failure remains visible.

Native reports live under `midscene_run/report/`; structured results live under
`.midscene/test-results/`. Reports contain screenshots and test data, so use only
the synthetic local fixture.

## Model-free checks

```sh
cd tests/midscene
npm run typecheck
npm run test:fixtures
```

Midscene validates YAML and nodes when executing the project. Fixture tests cover
server lifecycle, isolation and project-specific behavior. Shared report and
history tests live in Midscene Action.

## GitHub Actions

The workflow validates definitions on PRs without model credentials. Relevant
upstream `main` pushes run the AI suite automatically; maintainers can also dispatch
it manually. Forks run AI tests only by manual dispatch. Every AI run consumes model
tokens; do not configure secrets on an untrusted fork.

Configure these repository Actions secrets before the first AI run:

- `MIDSCENE_MODEL_BASE_URL`: OpenAI-compatible chat-completions base URL.
- `MIDSCENE_MODEL_API_KEY`: dedicated, quota-limited API key.
- `MIDSCENE_MODEL_NAME`: vision model or endpoint name.
- `MIDSCENE_MODEL_FAMILY`: the corresponding Midscene adapter, such as `doubao-seed`.

Missing credentials or a failed image-reading preflight fails the job explicitly.
Credentials are passed only to model preflight and test steps, not installation
or fixture processes. Native reports are uploaded after failures too.

The **Midscene E2E** job writes the framework-generated `result.md` directly to
its Summary, and uploads `midscene-results` even after failures. The
**Publish Midscene Pages report** job adds the online native HTML report link.
The HTML overview and case details come directly from Midscene Test. After
deployment, a separate Markdown renderer adds per-case screenshots and native
step links to the Pages job Summary.

Pages publication requires an existing native HTML report. Incomplete runs keep
downloadable artifacts and an explanatory Summary without replacing the existing
site or publishing a broken report link. Retention always protects the current
run, including a rerun whose run ID is older than the retained history.

To enable publication:

1. Ensure the repository Pages site is dedicated to these reports. Do not enable
   this if Pages already hosts project documentation.
2. Select **Settings → Pages → Source → GitHub Actions**.
3. Set `MIDSCENE_PUBLISH_REPO` to `quanru/rsdoctor` (or the upstream repository
   name after integration), and allow the trusted branch in `github-pages`.
4. Configure model credentials in repository settings or the `Model` environment.
   The API key remains a secret; model name, family, and base URL can be variables
   or secrets. The environment does not create a deployment record.

Manual dispatch can disable publication with `publish_pages`. Without Pages,
download the report and screenshots together from the artifact. The stable run
entry redirects to the native framework index. Runs are serialized across branches
to preserve recent report history.

Publication retains the latest three trusted runs within a 900 MiB budget.
Older Summary links expire when their run is pruned; artifacts expire after 14 days.

## Dependency audit

`npm audit` previously reported advisories in the Midscene 1.15.3 dependency tree,
including image processing and Puppeteer archive dependencies. These packages
stay in this isolated test harness, not the product's runtime dependencies.
Use synthetic local fixtures and a dedicated quota-limited model key. Do not run
`npm audit fix --force`: its suggested framework downgrades are incompatible with
this integration.

## CI evidence table

After Pages deployment succeeds, the publishing job adds a per-case Markdown
table to the workflow Summary: project, case, screenshot, status, duration,
and a link to the selected step in the native Midscene report. Failed cases
appear first. Successful cases use the last recorded step; failures use the
first failing step. Screenshots come from that step's execution trace, not a
different case or a synthetic image. Missing captures are explicitly marked.
The top-level report link still opens the framework-generated HTML report.
Without Pages, the test job retains the native text Summary and artifact link.

## Regular CI concurrency

The regular Midscene job runs all 13 cases with five concurrent files by default.
Each committed YAML file contains one original case with independent assertions and
an isolated browser context. Manual runs can select `file_concurrency=1` for
serial diagnosis. Local `npm test` remains serial by default.

The regular run publishes the native report index and per-case screenshot table
when Pages is configured. Native reports record case results, timing and model usage. CI job timestamps include setup and publication.

Regular CI validates definitions before model access in the test job, avoiding a
separate installation and job dependency. Slow cases start first based on the
measured durations from run 40623972888. All cases and independent assertions
are retained. Pages keeps the native index, trace data and screenshots, but omits
duplicate standalone Agent HTML; downloadable artifacts retain the full reports.

## Midscene action

Regular CI uses `web-infra-dev/midscene-action` pinned to commit
`5ef922b20a69d69a0f34639c4c867ba2049f6ede`, matching Midscene's own AI workflow.
The Action runs the native CLI, uploads `midscene-results`, writes the native
Summary and propagates test failures. Case sources are versioned in `cases/`. Model verification still runs first.

The Action's `publish-pages` input means Cloudflare Workers publication. It is
disabled here: the existing GitHub Pages job consumes the Action's artifact output
and retains the per-case screenshot table, report links and recent-run history.
No Cloudflare credentials or model configuration changes are required.

## Shared CI support

The root Midscene Action executes the native CLI and uploads its results. The
`pages` sub-action owns GitHub Pages publication, recent history and per-case
screenshot tables. This repository no longer maintains report parsers, publishing
scripts, migration/manifest guards or a custom execution/benchmark harness.

Pages support is temporarily pinned to `quanru/midscene-action-upstream/pages@b0b2fe13eac26c75327a4cf322865fcd98c9c0f4`
while its upstream PR is reviewed. Switch to the upstream reviewed commit after
merge. Existing Pages permissions, trusted triggers and publication locks remain
in the workflow; the shared action verifies historical report provenance.

`migration-inventory.json` remains historical documentation. The actual YAML files
are the AI suite's source of truth, and the original deterministic tests execute
their own contracts. Project support code only starts/stops fixtures, prepares
local assets, isolates browser/source state, and (for Rspress) computes the exact
workspace build-cache key.
