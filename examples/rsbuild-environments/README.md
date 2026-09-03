# Rsbuild environments

This example uses [Rsbuild environments](https://rsbuild.rs/config/environments) to build `web` and `node` targets in a single build.

Both environments inherit the same `tools.rspack` configuration and use the regular `RsdoctorRspackPlugin` export. Rsdoctor automatically groups the two compilers into one report and keeps their data separate.

Run the build from the repository root:

```bash
pnpm --filter @examples/doctor-rsbuild-environments build
```

The build outputs are written to `dist/web` and `dist/node`. The Rsdoctor data is written to `dist/.rsdoctor`, with non-primary compiler data under `dist/.rsdoctor/compilers/<compiler-name>`.

To build and open the report:

```bash
pnpm --filter @examples/doctor-rsbuild-environments build:analysis
```
