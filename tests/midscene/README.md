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
`@midscene/test` 1.15.3, not Vitest. Each case starts in a fresh browser context.
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
npm run collect
npm run typecheck
npm run test:summary
```

Collection validates YAML with the framework, checks the committed case inventory,
and rejects atomic AI operations or custom product-interaction nodes. Trust-policy checks reject reports from untrusted sources. The framework owns
report rendering and Markdown results.

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

`npm audit` reports advisories in the current Midscene 1.15.3 dependency tree,
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
