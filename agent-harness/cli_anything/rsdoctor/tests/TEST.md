# Test Plan for cli-anything-rsdoctor

## Overview

Two test suites cover the Python CLI harness:

| File               | Scope                                            | External deps?  |
| ------------------ | ------------------------------------------------ | --------------- |
| `test_core.py`     | Unit tests for core modules using synthetic data | None            |
| `test_full_e2e.py` | E2E tests via Click CliRunner + subprocess       | Temp files only |

---

## test_core.py — Unit Tests

All tests use in-memory synthetic manifest dictionaries. No files, no network.

### ManifestLoader

- `TestManifestLoaderGetChunks` — field presence, sizes, empty/missing graph, top-level vs inner dict
- `TestManifestLoaderGetModules` — field presence, size extraction, empty graph
- `TestManifestLoaderGetPackages` — field presence, name extraction
- `TestManifestLoaderGetAssets` — field presence
- `TestManifestLoaderGetSummary` — field presence, counts, hash
- `TestManifestLoaderGetRoutes` — route list, missing client key
- `TestManifestLoaderLoad` — round-trip from temp file, nonexistent path raises

### DataExporter

- `TestDataExporterFormatSize` — B / KB / MB / GB / None / fractional
- `TestDataExporterToJson` — dict, list, nested, empty, pretty-printed
- `TestDataExporterToTable` — empty returns "(no data)", columns appear, auto-columns
- `TestDataExporterFormatDelta` — positive prefix, negative prefix, zero

### BundleDiffer

- `TestBundleDifferCompare` — added/removed/changed chunks/modules/packages, size_delta, identical manifests
- `TestBundleDifferSummarize` — all delta fields, zero delta case

### RsdoctorSession

- `TestRsdoctorSession` — initial state None, load from temp file, clear, save/load state, error paths

### RsdoctorServerManager

- `TestRsdoctorServerManager` — status when idle, stop when idle, state read/write/clear, stale PID detection

---

## test_full_e2e.py — End-to-End Tests

Tests create real temporary manifest.json files, invoke the CLI via Click's `CliRunner`,
and verify exit codes and JSON output correctness.

### CliRunner-based

- `TestManifestInfoCommand` — exit 0, hash in output, JSON mode fields/counts, nonexistent path
- `TestManifestRoutesCommand` — exit 0, "Overall" present, JSON list
- `TestBundleChunksCommand` — exit 0, chunk names present, JSON list with size, --top, --min-size
- `TestBundleModulesCommand` — exit 0, JSON list with size fields, --top filter
- `TestBundlePackagesCommand` — exit 0, JSON list, version field
- `TestBundleAssetsCommand` — exit 0, JSON list with path/size
- `TestBundleLargeCommand` — exit 0, JSON structure, threshold filter
- `TestBundleDuplicatesCommand` — no duplicates message, duplicate detection, JSON mode
- `TestDiffCompareCommand` — exit 0, JSON mode with required keys, size change detected, --format json
- `TestDiffSummaryCommand` — exit 0, JSON mode keys, identical manifests zero delta
- `TestServerStatusCommand` — exit 0, JSON running field, stop when idle
- `TestVersionAndHelp` — all group --help exits 0, --version contains 0.1.0

### Subprocess-based (TestCLISubprocess)

- Uses installed binary when `CLI_ANYTHING_FORCE_INSTALLED=1`; falls back to `python -m`
- Tests: --help, --version, manifest info --json, bundle chunks --json, diff summary --json

---

## Running Tests

```bash
# From agent-harness/ directory
pip install -e .
pytest cli_anything/rsdoctor/tests/ -v --tb=short

# Unit tests only
pytest cli_anything/rsdoctor/tests/test_core.py -v

# E2E tests only
pytest cli_anything/rsdoctor/tests/test_full_e2e.py -v

# Force subprocess tests to use the installed binary
CLI_ANYTHING_FORCE_INSTALLED=1 pytest cli_anything/rsdoctor/tests/test_full_e2e.py -v -k subprocess
```

---

## Test Results

<!-- Results appended below after each run -->

### Run 1 — 2026-03-24

**Environment:** Python 3.13.5, pytest 9.0.2, platform darwin

**Command:**

```
.venv/bin/pytest cli_anything/rsdoctor/tests/ -v --tb=short
```

**Result: 118 passed in 1.20s — 0 failed, 0 errors, 0 skipped**

```
test_core.py::TestManifestLoaderGetChunks (7 tests)         PASSED
test_core.py::TestManifestLoaderGetModules (5 tests)        PASSED
test_core.py::TestManifestLoaderGetPackages (3 tests)       PASSED
test_core.py::TestManifestLoaderGetAssets (2 tests)         PASSED
test_core.py::TestManifestLoaderGetSummary (3 tests)        PASSED
test_core.py::TestManifestLoaderGetRoutes (2 tests)         PASSED
test_core.py::TestManifestLoaderLoad (2 tests)              PASSED
test_core.py::TestDataExporterFormatSize (7 tests)          PASSED
test_core.py::TestDataExporterToJson (5 tests)              PASSED
test_core.py::TestDataExporterToTable (3 tests)             PASSED
test_core.py::TestDataExporterFormatDelta (3 tests)         PASSED
test_core.py::TestBundleDifferCompare (9 tests)             PASSED
test_core.py::TestBundleDifferSummarize (2 tests)           PASSED
test_core.py::TestRsdoctorSession (6 tests)                 PASSED
test_core.py::TestRsdoctorServerManager (6 tests)           PASSED
test_full_e2e.py::TestManifestInfoCommand (6 tests)         PASSED
test_full_e2e.py::TestManifestRoutesCommand (3 tests)       PASSED
test_full_e2e.py::TestBundleChunksCommand (6 tests)         PASSED
test_full_e2e.py::TestBundleModulesCommand (4 tests)        PASSED
test_full_e2e.py::TestBundlePackagesCommand (3 tests)       PASSED
test_full_e2e.py::TestBundleAssetsCommand (3 tests)         PASSED
test_full_e2e.py::TestBundleLargeCommand (3 tests)          PASSED
test_full_e2e.py::TestBundleDuplicatesCommand (3 tests)     PASSED
test_full_e2e.py::TestDiffCompareCommand (4 tests)          PASSED
test_full_e2e.py::TestDiffSummaryCommand (3 tests)          PASSED
test_full_e2e.py::TestServerStatusCommand (4 tests)         PASSED
test_full_e2e.py::TestVersionAndHelp (6 tests)              PASSED
test_full_e2e.py::TestCLISubprocess (5 tests)               PASSED
```

**Verified:** `cli-anything-rsdoctor` binary installed at
`.venv/bin/cli-anything-rsdoctor` (version 0.1.0).
