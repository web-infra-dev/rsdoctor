# Rsdoctor SOP (Standard Operating Procedure)

## What is rsdoctor?

rsdoctor is a build-analysis tool for webpack and rspack. During a build, a
rsdoctor plugin collects data about chunks, modules, packages, loaders,
resolvers, and timing. That data is written to a `manifest.json` file (and
sometimes sharded across multiple JSON files).

## Manifest JSON Structure

```
manifest.json
├── client
│   └── enableRoutes: string[]       # Which UI pages are enabled
└── data
    ├── hash: string                 # Build hash
    ├── root: string                 # Project root directory
    ├── chunkGraph
    │   ├── chunks[]                 # Each chunk: id, name, size, initial, assets[], modules[]
    │   ├── assets[]                 # Output files: path, size
    │   └── entrypoints[]
    ├── moduleGraph
    │   └── modules[]                # Each module: id, path, size{sourceSize,transformedSize,parsedSize}
    ├── packageGraph
    │   └── packages[]               # Each npm package: id, name, version, size
    ├── summary
    │   └── costs[]                  # Build timing: name, value (ms)
    ├── loader[]                     # Loader timing per file
    ├── resolver[]                   # Resolver events
    ├── plugin[]                     # Plugin events
    ├── treeShaking                  # Tree-shaking analysis
    └── errors[]                     # Build errors
```

### Sharded Manifests

Sometimes `data` is a string URL (e.g., `"data": "http://localhost:8090/api/data"`),
or individual sub-keys are relative JSON file paths (e.g., `"chunkGraph": "./chunk-graph.json"`).
`ManifestLoader.load()` resolves both forms automatically.

## Node.js CLI

```bash
# Start analysis server (opens browser)
rsdoctor analyze manifest.json

# Compare two manifests (JSON output)
rsdoctor bundle-diff current.json baseline.json --json

# Analyze webpack stats file
rsdoctor stats-analyze stats.json
```

## Python CLI (this package)

```bash
# Inspect
cli-anything-rsdoctor manifest info <path>
cli-anything-rsdoctor manifest routes <path>

# Bundle analysis
cli-anything-rsdoctor bundle chunks <path> [--top N] [--min-size N] [--json]
cli-anything-rsdoctor bundle modules <path> [--top N] [--chunk ID] [--json]
cli-anything-rsdoctor bundle packages <path> [--top N] [--json]
cli-anything-rsdoctor bundle assets <path> [--top N] [--json]
cli-anything-rsdoctor bundle large <path> [--threshold N] [--json]
cli-anything-rsdoctor bundle duplicates <path> [--json]

# Diff
cli-anything-rsdoctor diff compare <current> <baseline> [--format json|table] [--json]
cli-anything-rsdoctor diff summary <current> <baseline> [--json]

# Server
cli-anything-rsdoctor server start <path> [--port N] [--bg] [--json]
cli-anything-rsdoctor server stop [--json]
cli-anything-rsdoctor server status [--json]

# REPL
cli-anything-rsdoctor shell
```

## Common Workflows

### Analyze a build

```bash
# After running `npm run build` with rsdoctor plugin enabled:
cli-anything-rsdoctor manifest info .rsdoctor/manifest.json
cli-anything-rsdoctor bundle chunks .rsdoctor/manifest.json --top 20
cli-anything-rsdoctor bundle duplicates .rsdoctor/manifest.json
```

### CI bundle size regression check

```bash
# Compare PR build against main branch baseline
cli-anything-rsdoctor diff summary pr/manifest.json main/manifest.json --json \
  | jq '.total_size_delta'
# Positive = bundle grew; negative = bundle shrank
```

### Interactive exploration

```bash
cli-anything-rsdoctor shell
rsdoctor> load .rsdoctor/manifest.json
rsdoctor> chunks --top 10
rsdoctor> modules --top 20
rsdoctor> packages
rsdoctor> quit
```

## Python API

```python
from cli_anything.rsdoctor.core.manifest import ManifestLoader
from cli_anything.rsdoctor.core.diff import BundleDiffer
from cli_anything.rsdoctor.core.export import DataExporter
from cli_anything.rsdoctor.core.session import RsdoctorSession

loader = ManifestLoader()
data = loader.load("manifest.json")
chunks = loader.get_chunks(data)   # list of dicts
modules = loader.get_modules(data)
packages = loader.get_packages(data)
assets = loader.get_assets(data)

differ = BundleDiffer()
diff = differ.compare(data_current, data_baseline)
summary = differ.summarize(diff)

exporter = DataExporter()
print(exporter.format_size(204800))  # "200.0 KB"
```

## Error Handling

- All CLI commands print errors to **stderr** and exit with code 1.
- With `--json`, errors are output as `{"error": "message"}` to stderr.
- `ManifestLoader.load()` raises `FileNotFoundError` for missing files.
- `RsdoctorServerManager.start()` raises `RuntimeError` if rsdoctor binary
  is not found in PATH or node_modules/.bin/.

## Key Files in This Package

| File                                           | Purpose               |
| ---------------------------------------------- | --------------------- |
| `cli_anything/rsdoctor/rsdoctor_cli.py`        | All Click commands    |
| `cli_anything/rsdoctor/core/manifest.py`       | ManifestLoader        |
| `cli_anything/rsdoctor/core/session.py`        | RsdoctorSession       |
| `cli_anything/rsdoctor/core/diff.py`           | BundleDiffer          |
| `cli_anything/rsdoctor/core/server.py`         | RsdoctorServerManager |
| `cli_anything/rsdoctor/core/export.py`         | DataExporter          |
| `cli_anything/rsdoctor/skills/SKILL.md`        | AI skill definition   |
| `cli_anything/rsdoctor/tests/test_core.py`     | Unit tests            |
| `cli_anything/rsdoctor/tests/test_full_e2e.py` | E2E tests             |
