# AGENT.md

## Stack

- Node.js `22+`
- `pnpm` workspace + `Nx` monorepo
- TypeScript (strict mode), Rspack/Rsbuild ecosystem
- Test runner: `rstest`

## Commands (run early)

```bash
# setup
pnpm install

# dev checks
pnpm lint
pnpm test
pnpm e2e

# focused work
pnpm --filter @rsdoctor/core run build
pnpm -C packages/components test
```

## Project structure

```text
packages/core/              # core + CLI
packages/components/        # UI components
packages/webpack-plugin/    # webpack plugin
packages/rspack-plugin/     # rspack plugin
packages/utils/             # shared utilities
packages/sdk/               # server SDK
packages/client/            # web client
packages/mcp-server/       # MCP server
examples/                   # runnable examples
```

## Code style

- Use single quotes and existing Prettier conventions.
- Keep TypeScript strict-safe; avoid `any`.
- Naming: camelCase (functions/files), PascalCase (types/classes).
