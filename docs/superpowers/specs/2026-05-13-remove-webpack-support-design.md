# Remove Webpack Support Design

## Goal

Rsdoctor will stop supporting Webpack as a bundler target. The repository should expose only Rspack-oriented product surfaces, while any internal concepts that remain valid for Rspack must be renamed away from Webpack-specific terminology so the codebase does not keep presenting a removed platform as a first-class concept.

## Scope

This change includes:

- Removing the public Webpack plugin package and every workspace consumer that exists only to exercise Webpack support.
- Removing Webpack examples, Webpack end-to-end cases, Webpack-specific helper scripts, and Webpack-only package dependencies.
- Rewriting public documentation, repository guidance, AI context, and package descriptions so they no longer advertise or instruct Webpack usage.
- Renaming shared API surfaces that currently use `Webpack*` naming even when they are consumed by Rspack flows.
- Renaming the module identity field `webpackId` to a bundler-neutral `identifier`, including graph APIs, fixtures, snapshots, and downstream data readers.
- Reworking any reusable implementation that currently lives in `webpack/`-named folders so retained Rspack functionality does not depend on Webpack-branded paths.

This change does not include:

- A compatibility shim for removed Webpack plugin imports.
- Maintaining legacy route aliases such as `/webpack/loaders/*` or `/webpack/plugins`.
- Keeping deprecated Webpack-specific names as type aliases.
- A migration utility for persisted report JSON that uses removed field names.

## Current State

Webpack support currently appears in several layers:

- Public package:
  - `packages/webpack-plugin`
- Examples and workspace apps:
  - `examples/webpack-minimal`
  - Webpack usage inside `examples/modern-minimal`
  - Webpack usage inside `examples/multiple-minimal`
- E2E and fixtures:
  - `e2e/cases/doctor-webpack`
  - Webpack-related E2E helpers and package dependencies
- Types and plugin options:
  - `RsdoctorWebpackPluginFeatures`
  - `RsdoctorWebpackPluginOptions`
  - `packages/types/src/plugin/webpack.ts`
- Client routes and pages:
  - `WebpackLoaders`
  - `WebpackPlugins`
  - `/webpack/loaders/*`
  - `/webpack/plugins`
- Shared UI and helpers:
  - `WebpackConfigurationViewer`
  - `useWebpackConfigurationByConfigs`
  - Webpack-specific plugin tables and page folders
- Shared data model:
  - `webpackId`
  - `getModuleByWebpackId`
  - `_moduleWebpackIdMap`
- Build graph internals:
  - `packages/core/src/build-utils/build/module-graph/webpack/transform.ts`
  - `packages/graph/src/transform/webpack/compatible.ts`
- Public docs and internal context:
  - Root README files
  - `AGENTS.md`
  - `CONTRIBUTING.md`
  - English and Chinese docs
  - AI resource files and package READMEs

Some of these names are truly Webpack-specific. Others are historical naming leaks that are still used by Rspack functionality. The cleanup must distinguish those two cases carefully.

## Target Architecture

### 1. Public Support Surface

Rsdoctor should expose only Rspack support after the cleanup.

- Remove `@rsdoctor/webpack-plugin`.
- Keep `@rsdoctor/rspack-plugin` as the only bundler integration package.
- Remove examples and tests whose primary purpose is validating Webpack.
- Remove Webpack installation instructions, configuration snippets, compatibility claims, and version coordination notes.

### 2. Shared Plugin Options

Rspack currently borrows plugin option names from the removed Webpack surface. These types should become neutral shared plugin options:

- `RsdoctorWebpackPluginFeatures` -> `RsdoctorPluginFeatures`
- `RsdoctorWebpackPluginOptions` -> `RsdoctorPluginOptions`

The renamed shared types should continue to describe:

- feature switches such as loader, plugins, resolver, bundle, tree-shaking, and lite mode
- loader interceptor options
- server, output, logging, SDK instance, and support flags

Rspack-specific plugin option types should extend or reference these neutral shared types directly, without routing through removed Webpack names.

### 3. Client Routes And Pages

Compile-analysis screens that remain meaningful for Rspack should stay available, but their names and routes should stop implying Webpack:

- `WebpackLoaders` -> `Loaders`
- `WebpackPlugins` -> `Plugins`
- `/webpack/loaders/overall` -> `/loaders/overall`
- `/webpack/loaders/analysis` -> `/loaders/analysis`
- `/webpack/plugins` -> `/plugins`

The manifest route enums, client route enums, menu matching logic, route feature predicates, page folders, and page exports should move together. No backward-compatible route alias is planned.

### 4. Shared UI Components

The configuration viewer should become bundler-neutral:

- `WebpackConfigurationViewer` -> `BundlerConfigurationViewer`
- `WebpackConfigurationViewerBase` -> `BundlerConfigurationViewerBase`
- `useWebpackConfigurationByConfigs` -> `useBundlerConfigurationByConfigs`

The helper may still inspect config records named `rspack`, but it should not search for or present `webpack` as a supported choice. Display text should prefer `rspack.config` when appropriate and use `bundler.config` only as a fallback if a generic label is still needed.

Plugin analysis UI components should also move away from Webpack naming where they remain in use.

### 5. Module Identity Data Model

`webpackId` is broadly used as a module identifier rather than as a feature exclusive to Webpack. To avoid carrying obsolete product semantics through the data layer, it should be renamed to `identifier`.

The renaming includes:

- `webpackId` -> `identifier`
- `getModuleByWebpackId` -> `getModuleByIdentifier`
- `_moduleWebpackIdMap` -> `_moduleIdentifierMap`

All graph, SDK, core rules, AI prompts, agent CLI data extraction, UI consumers, tests, fixtures, and snapshots must follow the new field name.

This is a breaking schema change for persisted report data and downstream consumers that read raw data directly. No compatibility layer is planned in this design.

### 6. Graph And Transform Internals

Webpack-specific transform modules should be removed if they exist only for the deleted plugin package.

If retained Rspack behavior currently depends on logic that happens to live under `webpack/`-named files, that reusable logic should be extracted into neutral or Rspack-oriented modules before deleting the old path. The guiding rule is:

- remove true Webpack support
- preserve Rspack analysis behavior
- eliminate Webpack-branded directory names from retained production paths

### 7. Documentation And Repository Metadata

All human-facing material should align with the new support statement:

- README files should say Rsdoctor targets the Rspack ecosystem, without claiming Webpack compatibility.
- Quick-start, options, playground, CLI, MCP, rule authoring, usage guides, and intro pages should stop referencing Webpack installation or configuration.
- `AGENTS.md`, `CONTRIBUTING.md`, and examples documentation should stop listing Webpack packages, scopes, examples, or project categories.
- AI context files should describe only the remaining supported integration.
- Conceptual links that currently point to Webpack docs should be replaced with Rspack equivalents where available. If a concept is generic and no good Rspack source exists, the wording should be adjusted so the repository does not imply Webpack support.

## Migration Decisions

### What Gets Deleted

- `packages/webpack-plugin`
- `examples/webpack-minimal`
- `e2e/cases/doctor-webpack`
- Webpack-only helper files such as `scripts/test-helper/src/webpack.ts`
- Webpack package references in examples, E2E manifests, workspace dependencies, and generated lockfile entries
- Webpack-specific type-only files that are no longer required after the refactor

### What Gets Renamed

- Public and internal types from `RsdoctorWebpack*` to `RsdoctorPlugin*`
- UI routes, pages, and components that still power Rspack-facing experiences
- Module identifier fields and accessors from `webpackId` vocabulary to `identifier`

### What Gets Preserved

- Rspack plugin behavior
- Loader, plugin, bundle, resolver, and rules analysis that remain valid for Rspack
- Existing report generation workflows, aside from intentional route and schema naming changes

## Testing Strategy

Implementation should be test-first where behavior changes occur.

Minimum verification should cover:

- Type-level and unit-test updates for renamed plugin options and identifier fields.
- Graph and SDK tests updated to prove `identifier` flows through module graph lookups and exported data.
- Core rule tests updated to prove renamed fields still power diagnostics.
- Components and route tests updated to prove new compile-analysis routes are wired correctly.
- Rspack plugin tests updated to prove loader and plugin routes are still added under the renamed manifest entries.
- Removal checks proving deleted Webpack packages, examples, and E2E cases no longer participate in workspace scripts.
- A lockfile refresh after package removal.

Expected focused validation commands:

- `pnpm --filter @rsdoctor/types run test` when applicable
- `pnpm --filter @rsdoctor/graph run test`
- `pnpm --filter @rsdoctor/sdk run test`
- `pnpm --filter @rsdoctor/core run test`
- `pnpm --filter @rsdoctor/components run test`
- `pnpm --filter @rsdoctor/rspack-plugin run test`
- `pnpm --filter @rsdoctor/agent-cli run test`
- targeted builds for touched packages when tests do not cover emitted artifacts sufficiently

Final repository-level checks should include:

- `rg -n -i "webpack" .`
- `rg -n "webpackId|getModuleByWebpackId|RsdoctorWebpack" .`

The target is to remove all remaining support-oriented references. Any surviving `webpack` string must be explicitly justified as an unavoidable third-party package name, imported upstream concept, or external historical citation that is still intentionally retained.

## Risks

- The `identifier` schema rename is broad and will invalidate persisted assumptions in fixtures, report JSON, CLI consumers, AI prompts, and UI helpers.
- Removing route aliases can break bookmarks and tests that assert old client paths.
- Shared transform code may look Webpack-specific by file name even when Rspack still depends on the underlying behavior; these cases require careful extraction rather than deletion by grep.
- Documentation cleanup can miss less obvious references in AI resource files, manifests, or example READMEs.

## Acceptance Criteria

The change is complete when:

- The workspace no longer contains a Webpack plugin package or Webpack-specific example/E2E suite.
- Public docs no longer present Webpack as a supported integration.
- The codebase no longer exposes `RsdoctorWebpack*`, `WebpackLoaders`, `WebpackPlugins`, `webpackId`, or `getModuleByWebpackId` as maintained product concepts.
- Rspack plugin behavior and retained compile-analysis pages continue to work through the renamed neutral surfaces.
- Focused tests and builds for affected packages pass.
- Repository search confirms that any remaining `webpack` text is intentional, minimal, and documented in the change review.
