"""End-to-end tests for cli-anything-rsdoctor.

These tests use real temporary manifest.json files and test the CLI via
Click's CliRunner as well as subprocess (when the package is installed).
"""
import json
import os
import tempfile
import unittest

from click.testing import CliRunner

from cli_anything.rsdoctor.rsdoctor_cli import cli


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_manifest(hash_val="testhash", root="/tmp/project"):
    """Return a minimal but complete synthetic manifest dict."""
    return {
        "client": {
            "enableRoutes": ["Overall", "Bundle.BundleSize", "Loader", "Resolver"]
        },
        "data": {
            "hash": hash_val,
            "root": root,
            "chunkGraph": {
                "chunks": [
                    {
                        "id": "chunk-main",
                        "name": "main",
                        "size": 204800,
                        "initial": True,
                        "assets": ["dist/main.js"],
                        "modules": ["mod-1", "mod-2"],
                    },
                    {
                        "id": "chunk-vendor",
                        "name": "vendor",
                        "size": 512000,
                        "initial": True,
                        "assets": ["dist/vendor.js"],
                        "modules": ["mod-3"],
                    },
                ],
                "assets": [
                    {"path": "dist/main.js", "size": 204800},
                    {"path": "dist/vendor.js", "size": 512000},
                ],
                "entrypoints": [],
            },
            "moduleGraph": {
                "modules": [
                    {
                        "id": "mod-1",
                        "path": "/src/index.ts",
                        "size": {"sourceSize": 1000, "transformedSize": 900, "parsedSize": 850},
                    },
                    {
                        "id": "mod-2",
                        "path": "/src/app.tsx",
                        "size": {"sourceSize": 5000, "transformedSize": 4500, "parsedSize": 4200},
                    },
                    {
                        "id": "mod-3",
                        "path": "/node_modules/react/index.js",
                        "size": {"sourceSize": 50000, "transformedSize": 45000, "parsedSize": 44000},
                    },
                ]
            },
            "packageGraph": {
                "packages": [
                    {"id": "pkg-react", "name": "react", "version": "18.2.0", "size": 44000},
                    {"id": "pkg-lodash", "name": "lodash", "version": "4.17.21", "size": 71000},
                ]
            },
            "summary": {
                "costs": [
                    {"name": "webpack", "value": 3200},
                    {"name": "loader", "value": 1500},
                ]
            },
            "loader": [],
            "errors": [],
        },
    }


def _write_manifest(data: dict) -> str:
    """Write data to a temp file and return its path."""
    f = tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    )
    json.dump(data, f)
    f.close()
    return f.name


# ---------------------------------------------------------------------------
# CliRunner-based tests
# ---------------------------------------------------------------------------

class TestManifestInfoCommand(unittest.TestCase):
    def setUp(self):
        self.runner = CliRunner()
        self.manifest_path = _write_manifest(_make_manifest())

    def tearDown(self):
        os.unlink(self.manifest_path)

    def test_manifest_info_exits_zero(self):
        result = self.runner.invoke(cli, ["manifest", "info", self.manifest_path])
        self.assertEqual(result.exit_code, 0, msg=result.output)

    def test_manifest_info_shows_hash(self):
        result = self.runner.invoke(cli, ["manifest", "info", self.manifest_path])
        self.assertIn("testhash", result.output)

    def test_manifest_info_shows_counts(self):
        result = self.runner.invoke(cli, ["manifest", "info", self.manifest_path])
        # Should mention chunk and module counts
        self.assertIn("2", result.output)  # 2 chunks

    def test_manifest_info_json_mode(self):
        result = self.runner.invoke(cli, ["manifest", "info", self.manifest_path, "--json"])
        self.assertEqual(result.exit_code, 0, msg=result.output)
        data = json.loads(result.output)
        self.assertIn("hash", data)
        self.assertEqual(data["hash"], "testhash")
        self.assertEqual(data["chunkCount"], 2)
        self.assertEqual(data["moduleCount"], 3)

    def test_manifest_info_nonexistent_path(self):
        result = self.runner.invoke(cli, ["manifest", "info", "/nonexistent/manifest.json"])
        self.assertNotEqual(result.exit_code, 0)

    def test_manifest_info_json_mode_nonexistent(self):
        result = self.runner.invoke(
            cli, ["manifest", "info", "/nonexistent/manifest.json", "--json"]
        )
        self.assertNotEqual(result.exit_code, 0)


class TestManifestRoutesCommand(unittest.TestCase):
    def setUp(self):
        self.runner = CliRunner()
        self.manifest_path = _write_manifest(_make_manifest())

    def tearDown(self):
        os.unlink(self.manifest_path)

    def test_routes_exits_zero(self):
        result = self.runner.invoke(cli, ["manifest", "routes", self.manifest_path])
        self.assertEqual(result.exit_code, 0, msg=result.output)

    def test_routes_shows_overall(self):
        result = self.runner.invoke(cli, ["manifest", "routes", self.manifest_path])
        self.assertIn("Overall", result.output)

    def test_routes_json_mode(self):
        result = self.runner.invoke(cli, ["manifest", "routes", self.manifest_path, "--json"])
        data = json.loads(result.output)
        self.assertIsInstance(data, list)
        self.assertIn("Overall", data)


class TestBundleChunksCommand(unittest.TestCase):
    def setUp(self):
        self.runner = CliRunner()
        self.manifest_path = _write_manifest(_make_manifest())

    def tearDown(self):
        os.unlink(self.manifest_path)

    def test_chunks_exits_zero(self):
        result = self.runner.invoke(cli, ["bundle", "chunks", self.manifest_path])
        self.assertEqual(result.exit_code, 0, msg=result.output)

    def test_chunks_shows_chunk_names(self):
        result = self.runner.invoke(cli, ["bundle", "chunks", self.manifest_path])
        self.assertIn("main", result.output)
        self.assertIn("vendor", result.output)

    def test_chunks_json_mode(self):
        result = self.runner.invoke(cli, ["bundle", "chunks", self.manifest_path, "--json"])
        self.assertEqual(result.exit_code, 0, msg=result.output)
        data = json.loads(result.output)
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 2)
        ids = {c["id"] for c in data}
        self.assertIn("chunk-main", ids)
        self.assertIn("chunk-vendor", ids)

    def test_chunks_json_contains_size(self):
        result = self.runner.invoke(cli, ["bundle", "chunks", self.manifest_path, "--json"])
        data = json.loads(result.output)
        for chunk in data:
            self.assertIn("size", chunk)
            self.assertIsInstance(chunk["size"], int)

    def test_chunks_top_filter(self):
        result = self.runner.invoke(cli, ["bundle", "chunks", self.manifest_path, "--top", "1", "--json"])
        data = json.loads(result.output)
        self.assertEqual(len(data), 1)
        # Top 1 by size should be vendor (512000)
        self.assertEqual(data[0]["id"], "chunk-vendor")

    def test_chunks_min_size_filter(self):
        result = self.runner.invoke(
            cli, ["bundle", "chunks", self.manifest_path, "--min-size", "400000", "--json"]
        )
        data = json.loads(result.output)
        # Only vendor (512000) should pass
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], "chunk-vendor")


class TestBundleModulesCommand(unittest.TestCase):
    def setUp(self):
        self.runner = CliRunner()
        self.manifest_path = _write_manifest(_make_manifest())

    def tearDown(self):
        os.unlink(self.manifest_path)

    def test_modules_exits_zero(self):
        result = self.runner.invoke(cli, ["bundle", "modules", self.manifest_path])
        self.assertEqual(result.exit_code, 0, msg=result.output)

    def test_modules_json_mode(self):
        result = self.runner.invoke(cli, ["bundle", "modules", self.manifest_path, "--json"])
        self.assertEqual(result.exit_code, 0, msg=result.output)
        data = json.loads(result.output)
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 3)

    def test_modules_json_has_size_fields(self):
        result = self.runner.invoke(cli, ["bundle", "modules", self.manifest_path, "--json"])
        data = json.loads(result.output)
        for mod in data:
            self.assertIn("id", mod)
            self.assertIn("path", mod)
            self.assertIn("sourceSize", mod)
            self.assertIn("parsedSize", mod)

    def test_modules_top_filter(self):
        result = self.runner.invoke(
            cli, ["bundle", "modules", self.manifest_path, "--top", "1", "--json"]
        )
        data = json.loads(result.output)
        self.assertEqual(len(data), 1)
        # Largest by parsedSize is mod-3 (44000)
        self.assertEqual(data[0]["id"], "mod-3")


class TestBundlePackagesCommand(unittest.TestCase):
    def setUp(self):
        self.runner = CliRunner()
        self.manifest_path = _write_manifest(_make_manifest())

    def tearDown(self):
        os.unlink(self.manifest_path)

    def test_packages_exits_zero(self):
        result = self.runner.invoke(cli, ["bundle", "packages", self.manifest_path])
        self.assertEqual(result.exit_code, 0, msg=result.output)

    def test_packages_json_mode(self):
        result = self.runner.invoke(cli, ["bundle", "packages", self.manifest_path, "--json"])
        self.assertEqual(result.exit_code, 0, msg=result.output)
        data = json.loads(result.output)
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 2)
        names = {p["name"] for p in data}
        self.assertIn("react", names)
        self.assertIn("lodash", names)

    def test_packages_json_has_version(self):
        result = self.runner.invoke(cli, ["bundle", "packages", self.manifest_path, "--json"])
        data = json.loads(result.output)
        by_name = {p["name"]: p for p in data}
        self.assertEqual(by_name["react"]["version"], "18.2.0")


class TestBundleAssetsCommand(unittest.TestCase):
    def setUp(self):
        self.runner = CliRunner()
        self.manifest_path = _write_manifest(_make_manifest())

    def tearDown(self):
        os.unlink(self.manifest_path)

    def test_assets_exits_zero(self):
        result = self.runner.invoke(cli, ["bundle", "assets", self.manifest_path])
        self.assertEqual(result.exit_code, 0, msg=result.output)

    def test_assets_json_mode(self):
        result = self.runner.invoke(cli, ["bundle", "assets", self.manifest_path, "--json"])
        self.assertEqual(result.exit_code, 0, msg=result.output)
        data = json.loads(result.output)
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 2)

    def test_assets_json_has_path_and_size(self):
        result = self.runner.invoke(cli, ["bundle", "assets", self.manifest_path, "--json"])
        data = json.loads(result.output)
        for asset in data:
            self.assertIn("path", asset)
            self.assertIn("size", asset)


class TestBundleLargeCommand(unittest.TestCase):
    def setUp(self):
        self.runner = CliRunner()
        self.manifest_path = _write_manifest(_make_manifest())

    def tearDown(self):
        os.unlink(self.manifest_path)

    def test_large_exits_zero(self):
        result = self.runner.invoke(cli, ["bundle", "large", self.manifest_path])
        self.assertEqual(result.exit_code, 0, msg=result.output)

    def test_large_json_mode(self):
        result = self.runner.invoke(cli, ["bundle", "large", self.manifest_path, "--json"])
        self.assertEqual(result.exit_code, 0, msg=result.output)
        data = json.loads(result.output)
        self.assertIn("large_chunks", data)
        self.assertIn("large_modules", data)
        self.assertIn("large_assets", data)
        self.assertIn("threshold", data)

    def test_large_threshold(self):
        result = self.runner.invoke(
            cli, ["bundle", "large", self.manifest_path, "--threshold", "400000", "--json"]
        )
        data = json.loads(result.output)
        # Only vendor chunk (512000) exceeds 400000
        chunk_ids = {c["id"] for c in data["large_chunks"]}
        self.assertIn("chunk-vendor", chunk_ids)
        self.assertNotIn("chunk-main", chunk_ids)


class TestBundleDuplicatesCommand(unittest.TestCase):
    def setUp(self):
        self.runner = CliRunner()

    def test_no_duplicates(self):
        data = _make_manifest()
        path = _write_manifest(data)
        try:
            result = self.runner.invoke(cli, ["bundle", "duplicates", path])
            self.assertEqual(result.exit_code, 0, msg=result.output)
            self.assertIn("No duplicate", result.output)
        finally:
            os.unlink(path)

    def test_with_duplicates(self):
        data = _make_manifest()
        # Add a duplicate react package (same name, different version)
        data["data"]["packageGraph"]["packages"].append(
            {"id": "pkg-react-old", "name": "react", "version": "17.0.2", "size": 40000}
        )
        path = _write_manifest(data)
        try:
            result = self.runner.invoke(cli, ["bundle", "duplicates", path])
            self.assertEqual(result.exit_code, 0, msg=result.output)
            self.assertIn("react", result.output)
        finally:
            os.unlink(path)

    def test_duplicates_json_mode_no_duplicates(self):
        path = _write_manifest(_make_manifest())
        try:
            result = self.runner.invoke(cli, ["bundle", "duplicates", path, "--json"])
            self.assertEqual(result.exit_code, 0, msg=result.output)
            data = json.loads(result.output)
            self.assertIsInstance(data, dict)
            self.assertEqual(len(data), 0)
        finally:
            os.unlink(path)


class TestDiffCompareCommand(unittest.TestCase):
    def setUp(self):
        self.runner = CliRunner()
        self.current_path = _write_manifest(_make_manifest(hash_val="new"))
        # Baseline with slightly different sizes
        baseline = _make_manifest(hash_val="old")
        baseline["data"]["chunkGraph"]["chunks"][0]["size"] = 180000  # main was smaller
        self.baseline_path = _write_manifest(baseline)

    def tearDown(self):
        os.unlink(self.current_path)
        os.unlink(self.baseline_path)

    def test_compare_exits_zero(self):
        result = self.runner.invoke(
            cli, ["diff", "compare", self.current_path, self.baseline_path]
        )
        self.assertEqual(result.exit_code, 0, msg=result.output)

    def test_compare_json_mode(self):
        result = self.runner.invoke(
            cli, ["diff", "compare", self.current_path, self.baseline_path, "--json"]
        )
        self.assertEqual(result.exit_code, 0, msg=result.output)
        data = json.loads(result.output)
        self.assertIn("added_chunks", data)
        self.assertIn("removed_chunks", data)
        self.assertIn("changed_chunks", data)
        self.assertIn("size_delta", data)

    def test_compare_detects_size_change(self):
        result = self.runner.invoke(
            cli, ["diff", "compare", self.current_path, self.baseline_path, "--json"]
        )
        data = json.loads(result.output)
        # main chunk changed from 180000 to 204800
        changed_ids = {c["id"] for c in data["changed_chunks"]}
        self.assertIn("chunk-main", changed_ids)

    def test_compare_format_json_option(self):
        result = self.runner.invoke(
            cli, ["diff", "compare", self.current_path, self.baseline_path, "--format", "json"]
        )
        self.assertEqual(result.exit_code, 0, msg=result.output)
        # Should be valid JSON
        data = json.loads(result.output)
        self.assertIn("size_delta", data)


class TestDiffSummaryCommand(unittest.TestCase):
    def setUp(self):
        self.runner = CliRunner()
        self.current_path = _write_manifest(_make_manifest(hash_val="new"))
        self.baseline_path = _write_manifest(_make_manifest(hash_val="old"))

    def tearDown(self):
        os.unlink(self.current_path)
        os.unlink(self.baseline_path)

    def test_summary_exits_zero(self):
        result = self.runner.invoke(
            cli, ["diff", "summary", self.current_path, self.baseline_path]
        )
        self.assertEqual(result.exit_code, 0, msg=result.output)

    def test_summary_json_mode(self):
        result = self.runner.invoke(
            cli, ["diff", "summary", self.current_path, self.baseline_path, "--json"]
        )
        self.assertEqual(result.exit_code, 0, msg=result.output)
        data = json.loads(result.output)
        self.assertIn("total_size_delta", data)
        self.assertIn("chunk_count_delta", data)
        self.assertIn("module_count_delta", data)
        self.assertIn("package_count_delta", data)

    def test_summary_identical_manifests_zero_delta(self):
        result = self.runner.invoke(
            cli, ["diff", "summary", self.current_path, self.current_path, "--json"]
        )
        data = json.loads(result.output)
        self.assertEqual(data["total_size_delta"], 0)
        self.assertEqual(data["chunk_count_delta"], 0)
        self.assertEqual(data["module_count_delta"], 0)


class TestServerStatusCommand(unittest.TestCase):
    def setUp(self):
        self.runner = CliRunner()

    def test_server_status_exits_zero(self):
        result = self.runner.invoke(cli, ["server", "status"])
        self.assertEqual(result.exit_code, 0, msg=result.output)

    def test_server_status_json_mode(self):
        result = self.runner.invoke(cli, ["server", "status", "--json"])
        self.assertEqual(result.exit_code, 0, msg=result.output)
        data = json.loads(result.output)
        self.assertIn("running", data)
        self.assertIsInstance(data["running"], bool)

    def test_server_stop_when_not_running(self):
        result = self.runner.invoke(cli, ["server", "stop"])
        self.assertEqual(result.exit_code, 0, msg=result.output)

    def test_server_stop_json_mode(self):
        result = self.runner.invoke(cli, ["server", "stop", "--json"])
        self.assertEqual(result.exit_code, 0, msg=result.output)
        data = json.loads(result.output)
        self.assertIn("stopped", data)


class TestVersionAndHelp(unittest.TestCase):
    def setUp(self):
        self.runner = CliRunner()

    def test_help(self):
        result = self.runner.invoke(cli, ["--help"])
        self.assertEqual(result.exit_code, 0)
        self.assertIn("rsdoctor", result.output.lower())

    def test_version(self):
        result = self.runner.invoke(cli, ["--version"])
        self.assertEqual(result.exit_code, 0)
        self.assertIn("0.1.0", result.output)

    def test_manifest_group_help(self):
        result = self.runner.invoke(cli, ["manifest", "--help"])
        self.assertEqual(result.exit_code, 0)

    def test_bundle_group_help(self):
        result = self.runner.invoke(cli, ["bundle", "--help"])
        self.assertEqual(result.exit_code, 0)

    def test_diff_group_help(self):
        result = self.runner.invoke(cli, ["diff", "--help"])
        self.assertEqual(result.exit_code, 0)

    def test_server_group_help(self):
        result = self.runner.invoke(cli, ["server", "--help"])
        self.assertEqual(result.exit_code, 0)


# ---------------------------------------------------------------------------
# Subprocess-based tests (only run when package is installed)
# ---------------------------------------------------------------------------

class TestCLISubprocess(unittest.TestCase):
    def _resolve_cli(self, name):
        """Find installed CLI or use module fallback.

        Returns the binary path if found (or env forces installed),
        otherwise returns None to signal tests should be skipped.
        """
        import shutil

        if os.environ.get("CLI_ANYTHING_FORCE_INSTALLED"):
            path = shutil.which(name)
            if not path:
                raise RuntimeError(f"{name} not found in PATH")
            return path
        # Use python -m fallback
        return None

    def _run_cli(self, *args):
        """Run the CLI via installed binary or python -m fallback."""
        import subprocess
        import sys

        cli_path = self._resolve_cli("cli-anything-rsdoctor")
        if cli_path:
            cmd = [cli_path] + list(args)
        else:
            cmd = [sys.executable, "-m", "cli_anything.rsdoctor.rsdoctor_cli"] + list(args)
        return subprocess.run(cmd, capture_output=True, text=True)

    def test_subprocess_help(self):
        result = self._run_cli("--help")
        self.assertEqual(result.returncode, 0)
        self.assertIn("rsdoctor", result.stdout.lower())

    def test_subprocess_version(self):
        result = self._run_cli("--version")
        self.assertEqual(result.returncode, 0)
        self.assertIn("0.1.0", result.stdout)

    def test_subprocess_manifest_info_json(self):
        data = _make_manifest()
        path = _write_manifest(data)
        try:
            result = self._run_cli("manifest", "info", path, "--json")
            self.assertEqual(result.returncode, 0, msg=result.stderr)
            parsed = json.loads(result.stdout)
            self.assertEqual(parsed["hash"], "testhash")
        finally:
            os.unlink(path)

    def test_subprocess_bundle_chunks_json(self):
        data = _make_manifest()
        path = _write_manifest(data)
        try:
            result = self._run_cli("bundle", "chunks", path, "--json")
            self.assertEqual(result.returncode, 0, msg=result.stderr)
            parsed = json.loads(result.stdout)
            self.assertEqual(len(parsed), 2)
        finally:
            os.unlink(path)

    def test_subprocess_diff_summary_json(self):
        path1 = _write_manifest(_make_manifest(hash_val="new"))
        path2 = _write_manifest(_make_manifest(hash_val="old"))
        try:
            result = self._run_cli("diff", "summary", path1, path2, "--json")
            self.assertEqual(result.returncode, 0, msg=result.stderr)
            parsed = json.loads(result.stdout)
            self.assertIn("total_size_delta", parsed)
        finally:
            os.unlink(path1)
            os.unlink(path2)


if __name__ == "__main__":
    unittest.main()
