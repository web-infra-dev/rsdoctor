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
