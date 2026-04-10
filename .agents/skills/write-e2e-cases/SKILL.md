---
name: write-e2e-cases
description: Use when adding or updating Rsdoctor end-to-end tests in `e2e/cases/`, including new feature coverage, bug reproduction, and regression prevention.
---

# Write E2E Cases

Rsdoctor E2E tests use **Playwright** and live under `e2e/cases/`. Each bundler has its own directory:

- `e2e/cases/doctor-rspack/` — tests using Rspack compilation
- `e2e/cases/doctor-webpack/` — tests using webpack compilation
- `e2e/cases/doctor-rsbuild/` — tests using Rsbuild
- `e2e/cases/doctor-rspeedy/` — tests using Rspeedy

## Steps

1. Review uncommitted git changes to define test scope and target behavior.

2. Read `e2e/README.md` and follow its conventions.

3. Use helpers from `@scripts/test-helper` (for example `compileByRspack`, `compileByWebpack5`) to compile fixtures. Do **not** call bundler APIs directly.

4. Add Playwright test files under the appropriate `e2e/cases/doctor-*` directory, following existing patterns.

5. Test fixtures (source files, loaders, configs) go in `fixtures/` subdirectories inside each case directory.

6. Keep assertions focused and readable; avoid redundant setup and checks.

7. Run `pnpm e2e` from the repository root to validate.

## Case Structure

- Each test file creates an Rsdoctor plugin instance (e.g., `createRsdoctorPlugin` from a local `test-utils.ts`), compiles a fixture via `compileByRspack` or `compileByWebpack5`, and asserts on the SDK store data.
- Fixtures are plain JS/TS files and loaders in `fixtures/` — not full application directories.
- Use `@rsdoctor/core/plugins` for `getSDK` / `setSDK` when inspecting analysis results.

## Constraints

- If tests can pass only after source-code changes, do not change source code directly. Explain the required source change and ask the user before proceeding.
