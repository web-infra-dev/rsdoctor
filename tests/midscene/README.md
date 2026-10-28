# Midscene AI E2E

Inspect asset modules, search modules, recover from an empty search, clear keyword
filters, and switch compiler environments. These five visual workflows supplement
the original deterministic tests. The fixture uses checked-out Rsdoctor plugins
and native reports.

`migration-inventory.json` records all 28 original E2E cases. The eight Midscene
replacements for restored deterministic checks have been removed.

All 28 original deterministic E2E cases are retained, including both input orders
for asset/module size filters, controlled debounce timing, Bundle Diff tabs,
brief-report sections, rule-panel text, and uploader visibility. Midscene adds
visual workflow coverage; it does not replace these assertions.
The original tests run through `pnpm e2e`; Ubuntu CI includes them in
`pnpm test:all`. Windows currently runs unit tests only.

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
`MIDSCENE_INCLUDE_TAGS=search` (Rspress) or `MIDSCENE_INCLUDE_TAGS=modules`
(Rsdoctor) to run one flow. Retries are disabled so the first failure remains visible.

Native reports live under `midscene_run/report/`; structured results live under
`.midscene/test-results/`. Reports contain screenshots and test data, so use only
the synthetic local fixture.

## Model-free checks

```sh
cd tests/midscene
npm run typecheck
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

The **Midscene E2E** job uses the native Midscene Action for execution, artifact
upload and Cloudflare Workers publication. The HTML index and case details come
from Midscene Test. After deployment, the Action adds per-case screenshots and
native step links to the same job Summary. Test failures remain failures.

Configure publication in repository settings or the `Model` environment:

- Secret `CLOUDFLARE_API_TOKEN`: scoped to the report account, with Workers edit
  permission for an existing Worker or Workers Admin to create one.
- Variable `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account ID.
- Worker name: `rsdoctor-midscene-reports`. Enable its Preview URLs if Cloudflare
  does not return a preview URL automatically.

Publication defaults on, including after relevant upstream main pushes. Missing
Cloudflare inputs fail explicitly before the Action runs tests. Manual dispatch
can set `publish_pages=false` to run with downloadable artifacts only; the input
name follows the Action, but publication targets Cloudflare, not GitHub Pages.
Each run/attempt gets its own Worker preview name. No GitHub Pages settings,
`MIDSCENE_PUBLISH_REPO`, history-copy job or `pages: write` permission is needed.
Existing GitHub Pages reports are not deleted. Raw artifacts retain the complete
reports for 14 days. Model runs remain serialized to bound endpoint load.

## Dependency audit

`npm audit` previously reported advisories in the Midscene 1.15.3 dependency tree,
including image processing and Puppeteer archive dependencies. These packages
stay in this isolated test harness, not the product's runtime dependencies.
Use synthetic local fixtures and a dedicated quota-limited model key. Do not run
`npm audit fix --force`: its suggested framework downgrades are incompatible with
this integration.

## CI evidence table

The Action reads the native HTML report's embedded run data. After Cloudflare
publication, Summary shows each case's screenshot, status, duration and native
step link, with failed cases first. Missing images are explicitly marked. Without
publication, the native text Summary and raw artifacts remain available.

## Regular CI concurrency

The regular Midscene job runs all 5 cases with five concurrent files by default.
Each committed YAML file contains one original case with independent assertions and
an isolated browser context. Manual runs can select `file_concurrency=1` for
serial diagnosis. Local `npm test` remains serial by default.

The regular run publishes the native report index and per-case screenshot table
when Cloudflare is configured. Native reports record case results, timing and model usage. CI job timestamps include setup and publication.

Regular CI validates definitions before model access in the test job, avoiding a
separate installation and job dependency. Slow cases start first based on the
measured durations from run 40623972888. All cases and independent assertions
are retained. Cloudflare hosts the native HTML index and its assets; downloadable
artifacts retain the full reports.

## Midscene action

The Action is pinned to `quanru/midscene-action-upstream@bc2184574faa46b62d4deec48347bebc97eefcc7`
while [upstream PR #1](https://github.com/web-infra-dev/midscene-action/pull/1)
adds screenshot tables to native Cloudflare publication. Repin to the official
reviewed commit after merge. There is no separate Pages sub-action or project-side
report renderer. Case sources are committed in `cases/`.

## Shared CI support

The Action owns execution, raw artifact upload, Cloudflare HTML publication and
screenshot summaries. Project support only starts/stops fixtures, prepares local
assets and isolates browser/source state; Rspress also computes its exact build
cache key. YAML is the AI suite source of truth. The migration inventory is
historical documentation; deterministic tests execute their own contracts.
