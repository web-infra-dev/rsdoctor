# cli-anything-rsdoctor

A Python CLI harness for the [rsdoctor](https://rsdoctor.dev) build analyzer.

## Overview

rsdoctor analyzes webpack/rspack builds and produces `manifest.json` files
containing detailed information about chunks, modules, packages, assets,
loaders, and build timing. This package provides a Python CLI to:

- Inspect manifest metadata and enabled routes
- List and filter chunks, modules, packages, and assets by size
- Detect duplicate NPM packages
- Compare two builds and report size deltas
- Manage the rsdoctor Node.js analysis server
- Run an interactive REPL session

## Installation

```bash
pip install cli-anything-rsdoctor
```

Or from source:

```bash
cd agent-harness
pip install -e .
```

## Requirements

- Python 3.8+
- `click>=8.0`
- `tabulate>=0.9`
- `requests>=2.28`

## Usage

### Inspect a manifest

```bash
cli-anything-rsdoctor manifest info .rsdoctor/manifest.json
cli-anything-rsdoctor manifest routes .rsdoctor/manifest.json
```

### Bundle analysis

```bash
# List all chunks sorted by size
cli-anything-rsdoctor bundle chunks .rsdoctor/manifest.json

# Top 10 chunks
cli-anything-rsdoctor bundle chunks .rsdoctor/manifest.json --top 10

# Chunks larger than 100KB
cli-anything-rsdoctor bundle chunks .rsdoctor/manifest.json --min-size 102400

# List modules
cli-anything-rsdoctor bundle modules .rsdoctor/manifest.json --top 20

# NPM packages
cli-anything-rsdoctor bundle packages .rsdoctor/manifest.json

# Output assets
cli-anything-rsdoctor bundle assets .rsdoctor/manifest.json

# Find large items (>500KB by default 100KB threshold)
cli-anything-rsdoctor bundle large .rsdoctor/manifest.json --threshold 512000

# Duplicate packages
cli-anything-rsdoctor bundle duplicates .rsdoctor/manifest.json
```

### Comparing builds

```bash
# Full diff output
cli-anything-rsdoctor diff compare current/manifest.json baseline/manifest.json

# Summary only
cli-anything-rsdoctor diff summary current/manifest.json baseline/manifest.json
```

### Server management

```bash
cli-anything-rsdoctor server start .rsdoctor/manifest.json --port 8090
cli-anything-rsdoctor server status
cli-anything-rsdoctor server stop
```

### Interactive shell

```bash
cli-anything-rsdoctor shell
rsdoctor> load .rsdoctor/manifest.json
rsdoctor> chunks --top 10
rsdoctor> packages
rsdoctor> quit
```

## JSON Output Mode

All commands support `--json` for machine-readable output:

```bash
cli-anything-rsdoctor bundle chunks manifest.json --json
# [{"id": "chunk-main", "name": "main", "size": 204800, ...}, ...]

cli-anything-rsdoctor diff summary cur.json base.json --json
# {"total_size_delta": -12345, "chunk_count_delta": 0, ...}
```

When `--json` is used:

- Only valid JSON is written to stdout
- Errors go to stderr
- Exit code 0 on success, 1 on error

## Package Structure

```
cli_anything/rsdoctor/
├── rsdoctor_cli.py      # Click CLI entry point
├── core/
│   ├── manifest.py      # ManifestLoader
│   ├── session.py       # RsdoctorSession
│   ├── diff.py          # BundleDiffer
│   ├── server.py        # RsdoctorServerManager
│   └── export.py        # DataExporter
├── utils/
│   └── formatting.py    # CLI output helpers
└── tests/
    ├── test_core.py
    └── test_full_e2e.py
```

## Running Tests

```bash
cd agent-harness
pip install -e .
pytest cli_anything/rsdoctor/tests/ -v --tb=short
```
