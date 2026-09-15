# @rsdoctor/agent-cli

`@rsdoctor/agent-cli` is a small command-line tool for reading Rsdoctor analysis data and exposing it as structured JSON.

It is intended to be used together with the `rsdoctor-analysis` skill from [agent-skills](https://github.com/rstackjs/agent-skills). Trigger that skill first, then use this CLI to inspect the generated Rsdoctor data.

To add the skill locally:

```bash
npx skills add rstackjs/agent-skills --skill rsdoctor-analysis
```

It provides two ways to work with the catalog:

- `list` and `query` for machine-oriented access.
- Direct group commands such as `chunks list`, `modules by-id`, and `tree-shaking summary` for interactive use.

## Installation

```bash
pnpm add -D @rsdoctor/agent-cli
```

The package exposes a binary named `rsdoctor-agent`.

## Usage

```bash
rsdoctor-agent --help
rsdoctor-agent list
rsdoctor-agent query <tool-name> --data-file <path>
rsdoctor-agent <group> <subcommand> --data-file <path>
```

## Top-level commands

### `list`

Prints all available subcommands in machine-readable JSON, including their descriptions and argument schemas.

```bash
rsdoctor-agent list
```

### `query`

Executes one catalog tool by name and returns the result as JSON.

```bash
rsdoctor-agent query packages_duplicates \
  --data-file ./rsdoctor-data.json \
  --input '{"includeDev":true}' \
  --filter rule,totalRules \
  --page 1 \
  --page-size 20
```

Useful options:

- `--data-file <path>`: path to the Rsdoctor data file.
- `--compiler <name>`: compiler name from `compilers list`; required for reports with multiple indexed compilers.
- `--input <json>`: tool input payload, defaulting to `{}`.
- `--filter <fields>`: comma-separated field paths to keep in the output.
- `--page <n>`: page number for paginated results.
- `--page-size <n>`: page size for paginated results.

## Direct commands

If you want to inspect a specific area of the report, you can call the grouped commands directly.

Examples:

```bash
rsdoctor-agent chunks list --data-file ./rsdoctor-data.json
rsdoctor-agent modules by-id --data-file ./rsdoctor-data.json --id 42
rsdoctor-agent packages list --data-file ./rsdoctor-data.json --page-number 1 --page-size 50
rsdoctor-agent tree-shaking summary --data-file ./rsdoctor-data.json
```

You can also inspect schemas and command descriptions:

```bash
rsdoctor-agent --describe
rsdoctor-agent --schema chunks.list
rsdoctor-agent chunks --describe
```

## Selecting a compiler

For a build with multiple compilers, such as client and server builds, first list the compilers in the report:

```bash
rsdoctor-agent compilers list --data-file ./rsdoctor-data.json
```

The JSON response contains `data.compilers`, with each compiler's `name`, absolute `dataFile` path, and `available` flag indicating whether the file exists. You can also use `query compilers_list` to retrieve this list.

Use the exact `name` from the list to select a compiler. Both direct analysis commands and `query` accept `--compiler`:

```bash
rsdoctor-agent chunks list --data-file ./rsdoctor-data.json --compiler server
rsdoctor-agent query packages_duplicates --data-file ./rsdoctor-data.json --compiler server
```

Pass `--compiler` as a CLI option, outside the `--input` JSON. The CLI resolves the selected file relative to the report's compiler index, so you can keep using the same `--data-file` path for different compilers. When moving reports, copy the indexed compiler files too and preserve their relative paths.

- With one indexed compiler, the CLI selects it automatically.
- With multiple indexed compilers, specify `--compiler`, even when the input file contains one compiler's data directly.
- Older reports without a compiler index remain readable without `--compiler`. To select a compiler by name, regenerate the reports with a plugin version that writes the index.

For `assets diff`, the same compiler name is selected independently in the baseline and current reports:

```bash
rsdoctor-agent assets diff --data-file ./current/rsdoctor-data.json \
  --baseline ./baseline/rsdoctor-data.json \
  --current ./current/rsdoctor-data.json --compiler server
```

Compiler selection errors are written as JSON to stderr and return a non-zero exit code. `COMPILER_REQUIRED` and `COMPILER_NOT_FOUND` include the available names in `error.compilers`. If a compiler's `available` flag is `false`, restore its data file or regenerate the report before analyzing it. Each analysis reads one compiler; results from different compilers are not merged.

## Output

- Successful commands print JSON to stdout.
- Errors are printed to stderr and the process exits with a non-zero code.
- The `--compact` flag prints minified JSON for commands that support it.

## Development

```bash
pnpm install
pnpm --filter @rsdoctor/agent-cli run build
pnpm --filter @rsdoctor/agent-cli run test
```

## Repository

This package lives in the `packages/agent-cli` workspace and is part of the Rsdoctor monorepo.
