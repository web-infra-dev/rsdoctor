# Rspack child compiler example

This example creates a main compiler and a child compiler in the same Rspack
build. Rsdoctor collects an independent report for each compiler.

```bash
pnpm build
pnpm build:analysis
```

`build` writes the report without starting the client server.
`build:analysis` opens the report, where the compiler selector contains:

- `Main compiler`
- `child-assets` with a `Child` tag

The generated JavaScript assets are `dist/main.js` and
`dist/child-assets.js`.

The main entry is processed by `loaders/main-loader.js`, while the child entry
is processed by `loaders/child-loader.js`. The Loaders page in each compiler
report therefore shows only the loader and resource that belong to that
compiler.
