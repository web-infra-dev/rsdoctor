"""Unit tests for cli-anything-rsdoctor core modules.

These tests use synthetic data and do NOT require external services,
real manifest files, or the Node.js rsdoctor CLI.
"""
import json
import os
import tempfile
import unittest

from cli_anything.rsdoctor.core.diff import BundleDiffer
from cli_anything.rsdoctor.core.export import DataExporter
from cli_anything.rsdoctor.core.manifest import ManifestLoader
from cli_anything.rsdoctor.core.server import RsdoctorServerManager
from cli_anything.rsdoctor.core.session import RsdoctorSession


# ---------------------------------------------------------------------------
# Synthetic fixtures
# ---------------------------------------------------------------------------

def _make_manifest(
    hash_val="abc123",
    root="/tmp/project",
    chunks=None,
    modules=None,
    packages=None,
    assets=None,
    routes=None,
):
    """Build a synthetic manifest dict."""
    if chunks is None:
        chunks = [
            {"id": "chunk-1", "name": "main", "size": 204800, "initial": True,
             "assets": ["main.js"], "modules": ["mod-1", "mod-2"]},
            {"id": "chunk-2", "name": "vendor", "size": 512000, "initial": True,
             "assets": ["vendor.js"], "modules": ["mod-3"]},
        ]
    if modules is None:
        modules = [
            {"id": "mod-1", "path": "/src/index.ts",
             "size": {"sourceSize": 1000, "transformedSize": 900, "parsedSize": 850}},
            {"id": "mod-2", "path": "/src/app.ts",
             "size": {"sourceSize": 2000, "transformedSize": 1800, "parsedSize": 1700}},
            {"id": "mod-3", "path": "/node_modules/react/index.js",
             "size": {"sourceSize": 50000, "transformedSize": 45000, "parsedSize": 44000}},
        ]
    if packages is None:
        packages = [
            {"id": "pkg-1", "name": "react", "version": "18.2.0", "size": 44000},
            {"id": "pkg-2", "name": "lodash", "version": "4.17.21", "size": 71000},
        ]
    if assets is None:
        assets = [
            {"path": "dist/main.js", "size": 204800},
            {"path": "dist/vendor.js", "size": 512000},
        ]
    if routes is None:
        routes = ["Overall", "Bundle.BundleSize", "Loader"]

    return {
        "client": {"enableRoutes": routes},
        "data": {
            "hash": hash_val,
            "root": root,
            "chunkGraph": {
                "chunks": chunks,
                "assets": assets,
                "entrypoints": [],
            },
            "moduleGraph": {"modules": modules},
            "packageGraph": {"packages": packages},
            "summary": {"costs": [{"name": "total", "value": 3200}]},
            "loader": [],
            "errors": [],
        },
    }


# ---------------------------------------------------------------------------
# ManifestLoader tests
# ---------------------------------------------------------------------------

class TestManifestLoaderGetChunks(unittest.TestCase):
    def setUp(self):
        self.loader = ManifestLoader()
        self.data = _make_manifest()

    def test_returns_list(self):
        chunks = self.loader.get_chunks(self.data)
        self.assertIsInstance(chunks, list)

    def test_chunk_count(self):
        chunks = self.loader.get_chunks(self.data)
        self.assertEqual(len(chunks), 2)

    def test_chunk_fields(self):
        chunks = self.loader.get_chunks(self.data)
        for c in chunks:
            self.assertIn("id", c)
            self.assertIn("name", c)
            self.assertIn("size", c)
            self.assertIn("initial", c)
            self.assertIn("assets", c)
            self.assertIn("modules", c)

    def test_chunk_sizes(self):
        chunks = self.loader.get_chunks(self.data)
        sizes = {c["id"]: c["size"] for c in chunks}
        self.assertEqual(sizes["chunk-1"], 204800)
        self.assertEqual(sizes["chunk-2"], 512000)

    def test_empty_chunk_graph(self):
        data = {"data": {"chunkGraph": {"chunks": []}, "moduleGraph": {}, "packageGraph": {}}}
        chunks = self.loader.get_chunks(data)
        self.assertEqual(chunks, [])

    def test_missing_chunk_graph(self):
        data = {"data": {}}
        chunks = self.loader.get_chunks(data)
        self.assertEqual(chunks, [])

    def test_accepts_inner_data_dict(self):
        """Loader should also work when passed the inner 'data' dict directly."""
        inner = self.data["data"]
        chunks = self.loader.get_chunks(inner)
        self.assertEqual(len(chunks), 2)


class TestManifestLoaderGetModules(unittest.TestCase):
    def setUp(self):
        self.loader = ManifestLoader()
        self.data = _make_manifest()

    def test_returns_list(self):
        modules = self.loader.get_modules(self.data)
        self.assertIsInstance(modules, list)

    def test_module_count(self):
        modules = self.loader.get_modules(self.data)
        self.assertEqual(len(modules), 3)

    def test_module_fields(self):
        modules = self.loader.get_modules(self.data)
        for m in modules:
            self.assertIn("id", m)
            self.assertIn("path", m)
            self.assertIn("sourceSize", m)
            self.assertIn("transformedSize", m)
            self.assertIn("parsedSize", m)

    def test_module_sizes(self):
        modules = self.loader.get_modules(self.data)
        by_id = {m["id"]: m for m in modules}
        self.assertEqual(by_id["mod-1"]["sourceSize"], 1000)
        self.assertEqual(by_id["mod-1"]["parsedSize"], 850)

    def test_empty_module_graph(self):
        data = {"data": {"chunkGraph": {}, "moduleGraph": {"modules": []}, "packageGraph": {}}}
        modules = self.loader.get_modules(data)
        self.assertEqual(modules, [])


class TestManifestLoaderGetPackages(unittest.TestCase):
    def setUp(self):
        self.loader = ManifestLoader()
        self.data = _make_manifest()

    def test_package_count(self):
        packages = self.loader.get_packages(self.data)
        self.assertEqual(len(packages), 2)

    def test_package_fields(self):
        packages = self.loader.get_packages(self.data)
        for p in packages:
            self.assertIn("id", p)
            self.assertIn("name", p)
            self.assertIn("version", p)
            self.assertIn("size", p)

    def test_package_names(self):
        packages = self.loader.get_packages(self.data)
        names = {p["name"] for p in packages}
        self.assertIn("react", names)
        self.assertIn("lodash", names)


class TestManifestLoaderGetAssets(unittest.TestCase):
    def setUp(self):
        self.loader = ManifestLoader()
        self.data = _make_manifest()

    def test_asset_count(self):
        assets = self.loader.get_assets(self.data)
        self.assertEqual(len(assets), 2)

    def test_asset_fields(self):
        assets = self.loader.get_assets(self.data)
        for a in assets:
            self.assertIn("path", a)
            self.assertIn("size", a)


class TestManifestLoaderGetSummary(unittest.TestCase):
    def setUp(self):
        self.loader = ManifestLoader()
        self.data = _make_manifest()

    def test_summary_fields(self):
        summary = self.loader.get_summary(self.data)
        self.assertIn("hash", summary)
        self.assertIn("root", summary)
        self.assertIn("chunkCount", summary)
        self.assertIn("moduleCount", summary)
        self.assertIn("packageCount", summary)
        self.assertIn("assetCount", summary)

    def test_summary_counts(self):
        summary = self.loader.get_summary(self.data)
        self.assertEqual(summary["chunkCount"], 2)
        self.assertEqual(summary["moduleCount"], 3)
        self.assertEqual(summary["packageCount"], 2)

    def test_summary_hash(self):
        summary = self.loader.get_summary(self.data)
        self.assertEqual(summary["hash"], "abc123")


class TestManifestLoaderGetRoutes(unittest.TestCase):
    def setUp(self):
        self.loader = ManifestLoader()
        self.data = _make_manifest(routes=["Overall", "Bundle.BundleSize"])

    def test_routes(self):
        routes = self.loader.get_routes(self.data)
        self.assertEqual(routes, ["Overall", "Bundle.BundleSize"])

    def test_missing_client(self):
        data = {"data": {}}
        routes = self.loader.get_routes(data)
        self.assertEqual(routes, [])


class TestManifestLoaderLoad(unittest.TestCase):
    def setUp(self):
        self.loader = ManifestLoader()

    def test_load_from_file(self):
        data = _make_manifest()
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False, encoding="utf-8"
        ) as f:
            json.dump(data, f)
            tmp_path = f.name
        try:
            loaded = self.loader.load(tmp_path)
            self.assertIn("data", loaded)
            self.assertIn("client", loaded)
            self.assertEqual(loaded["data"]["hash"], "abc123")
        finally:
            os.unlink(tmp_path)

    def test_load_nonexistent_raises(self):
        with self.assertRaises(FileNotFoundError):
            self.loader.load("/nonexistent/path/manifest.json")


# ---------------------------------------------------------------------------
# DataExporter tests
# ---------------------------------------------------------------------------

class TestDataExporterFormatSize(unittest.TestCase):
    def setUp(self):
        self.exporter = DataExporter()

    def test_bytes(self):
        self.assertEqual(self.exporter.format_size(0), "0 B")
        self.assertEqual(self.exporter.format_size(512), "512 B")
        self.assertEqual(self.exporter.format_size(1023), "1023 B")

    def test_kilobytes(self):
        result = self.exporter.format_size(1024)
        self.assertIn("KB", result)
        self.assertEqual(result, "1.0 KB")

    def test_megabytes(self):
        result = self.exporter.format_size(1024 * 1024)
        self.assertIn("MB", result)
        self.assertEqual(result, "1.0 MB")

    def test_gigabytes(self):
        result = self.exporter.format_size(1024 * 1024 * 1024)
        self.assertIn("GB", result)
        self.assertEqual(result, "1.0 GB")

    def test_fractional(self):
        result = self.exporter.format_size(1536)  # 1.5 KB
        self.assertEqual(result, "1.5 KB")

    def test_none_returns_zero(self):
        self.assertEqual(self.exporter.format_size(None), "0 B")

    def test_large_megabytes(self):
        result = self.exporter.format_size(5 * 1024 * 1024)
        self.assertEqual(result, "5.0 MB")


class TestDataExporterToJson(unittest.TestCase):
    def setUp(self):
        self.exporter = DataExporter()

    def test_simple_dict(self):
        result = self.exporter.to_json({"a": 1, "b": 2})
        parsed = json.loads(result)
        self.assertEqual(parsed, {"a": 1, "b": 2})

    def test_list(self):
        result = self.exporter.to_json([1, 2, 3])
        self.assertEqual(json.loads(result), [1, 2, 3])

    def test_nested(self):
        data = {"chunks": [{"id": "c1", "size": 1024}]}
        result = self.exporter.to_json(data)
        parsed = json.loads(result)
        self.assertEqual(parsed["chunks"][0]["size"], 1024)

    def test_empty_dict(self):
        self.assertEqual(json.loads(self.exporter.to_json({})), {})

    def test_pretty_printed(self):
        # Should contain newlines (pretty printed)
        result = self.exporter.to_json({"key": "value"})
        self.assertIn("\n", result)


class TestDataExporterToTable(unittest.TestCase):
    def setUp(self):
        self.exporter = DataExporter()

    def test_empty_returns_no_data(self):
        result = self.exporter.to_table([], [])
        self.assertIn("no data", result)

    def test_columns_appear(self):
        data = [{"name": "react", "version": "18.2.0", "size": 44000}]
        result = self.exporter.to_table(data, columns=["name", "version"])
        self.assertIn("name", result)
        self.assertIn("version", result)
        self.assertIn("react", result)

    def test_no_columns_uses_all_keys(self):
        data = [{"a": 1, "b": 2}]
        result = self.exporter.to_table(data)
        self.assertIn("a", result)
        self.assertIn("b", result)


class TestDataExporterFormatDelta(unittest.TestCase):
    def setUp(self):
        self.exporter = DataExporter()

    def test_positive_delta(self):
        result = self.exporter.format_delta(1024)
        self.assertTrue(result.startswith("+"))

    def test_negative_delta(self):
        result = self.exporter.format_delta(-1024)
        self.assertTrue(result.startswith("-"))

    def test_zero_delta(self):
        self.assertEqual(self.exporter.format_delta(0), "0 B")


# ---------------------------------------------------------------------------
# BundleDiffer tests
# ---------------------------------------------------------------------------

class TestBundleDifferCompare(unittest.TestCase):
    def setUp(self):
        self.differ = BundleDiffer()
        self.current = _make_manifest(
            hash_val="new",
            chunks=[
                {"id": "chunk-1", "name": "main", "size": 250000, "initial": True,
                 "assets": [], "modules": ["mod-1"]},
                {"id": "chunk-3", "name": "new-chunk", "size": 50000, "initial": False,
                 "assets": [], "modules": []},
            ],
            modules=[
                {"id": "mod-1", "path": "/src/index.ts",
                 "size": {"sourceSize": 1500, "transformedSize": 1300, "parsedSize": 1200}},
            ],
            packages=[
                {"id": "pkg-1", "name": "react", "version": "18.3.0", "size": 46000},
                {"id": "pkg-3", "name": "zustand", "version": "4.0.0", "size": 15000},
            ],
        )
        self.baseline = _make_manifest(
            hash_val="old",
            chunks=[
                {"id": "chunk-1", "name": "main", "size": 204800, "initial": True,
                 "assets": [], "modules": ["mod-1"]},
                {"id": "chunk-2", "name": "vendor", "size": 512000, "initial": True,
                 "assets": [], "modules": ["mod-3"]},
            ],
            modules=[
                {"id": "mod-1", "path": "/src/index.ts",
                 "size": {"sourceSize": 1000, "transformedSize": 900, "parsedSize": 850}},
                {"id": "mod-3", "path": "/node_modules/react/index.js",
                 "size": {"sourceSize": 50000, "transformedSize": 45000, "parsedSize": 44000}},
            ],
            packages=[
                {"id": "pkg-1", "name": "react", "version": "18.2.0", "size": 44000},
                {"id": "pkg-2", "name": "lodash", "version": "4.17.21", "size": 71000},
            ],
        )

    def test_returns_dict(self):
        result = self.differ.compare(self.current, self.baseline)
        self.assertIsInstance(result, dict)

    def test_required_keys(self):
        result = self.differ.compare(self.current, self.baseline)
        for key in [
            "added_chunks", "removed_chunks", "changed_chunks",
            "added_modules", "removed_modules",
            "added_packages", "removed_packages",
            "size_delta",
        ]:
            self.assertIn(key, result)

    def test_added_chunks(self):
        result = self.differ.compare(self.current, self.baseline)
        added_ids = {c["id"] for c in result["added_chunks"]}
        self.assertIn("chunk-3", added_ids)

    def test_removed_chunks(self):
        result = self.differ.compare(self.current, self.baseline)
        removed_ids = {c["id"] for c in result["removed_chunks"]}
        self.assertIn("chunk-2", removed_ids)

    def test_changed_chunks(self):
        result = self.differ.compare(self.current, self.baseline)
        changed_ids = {c["id"] for c in result["changed_chunks"]}
        self.assertIn("chunk-1", changed_ids)

    def test_size_delta(self):
        result = self.differ.compare(self.current, self.baseline)
        # current: 250000 + 50000 = 300000, baseline: 204800 + 512000 = 716800
        expected_delta = 300000 - 716800
        self.assertEqual(result["size_delta"], expected_delta)

    def test_added_packages(self):
        result = self.differ.compare(self.current, self.baseline)
        added_names = {p["name"] for p in result["added_packages"]}
        self.assertIn("zustand", added_names)

    def test_removed_packages(self):
        result = self.differ.compare(self.current, self.baseline)
        removed_names = {p["name"] for p in result["removed_packages"]}
        self.assertIn("lodash", removed_names)

    def test_identical_manifests(self):
        data = _make_manifest()
        result = self.differ.compare(data, data)
        self.assertEqual(result["added_chunks"], [])
        self.assertEqual(result["removed_chunks"], [])
        self.assertEqual(result["changed_chunks"], [])
        self.assertEqual(result["size_delta"], 0)


class TestBundleDifferSummarize(unittest.TestCase):
    def setUp(self):
        self.differ = BundleDiffer()

    def test_summarize_fields(self):
        diff = {
            "added_chunks": [{"id": "c1"}],
            "removed_chunks": [],
            "changed_chunks": [{"id": "c2", "delta": 1000}],
            "added_modules": [{"id": "m1"}, {"id": "m2"}],
            "removed_modules": [{"id": "m3"}],
            "added_packages": [],
            "removed_packages": [{"name": "lodash"}],
            "size_delta": 5000,
            "current_total_size": 105000,
            "baseline_total_size": 100000,
        }
        summary = self.differ.summarize(diff)
        self.assertEqual(summary["total_size_delta"], 5000)
        self.assertEqual(summary["chunk_count_delta"], 1)   # +1 added, 0 removed
        self.assertEqual(summary["module_count_delta"], 1)  # +2 added, -1 removed
        self.assertEqual(summary["package_count_delta"], -1)  # 0 added, -1 removed
        self.assertEqual(summary["changed_chunks_count"], 1)

    def test_summarize_zero_delta(self):
        diff = {
            "added_chunks": [], "removed_chunks": [],
            "changed_chunks": [], "added_modules": [],
            "removed_modules": [], "added_packages": [],
            "removed_packages": [], "size_delta": 0,
            "current_total_size": 0, "baseline_total_size": 0,
        }
        summary = self.differ.summarize(diff)
        self.assertEqual(summary["total_size_delta"], 0)
        self.assertEqual(summary["chunk_count_delta"], 0)


# ---------------------------------------------------------------------------
# RsdoctorSession tests
# ---------------------------------------------------------------------------

class TestRsdoctorSession(unittest.TestCase):
    def test_initial_state(self):
        session = RsdoctorSession()
        self.assertIsNone(session.get_current())
        self.assertIsNone(session.get_manifest_path())

    def test_load_from_temp_file(self):
        data = _make_manifest()
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False, encoding="utf-8"
        ) as f:
            json.dump(data, f)
            tmp_path = f.name
        try:
            session = RsdoctorSession()
            result = session.load(tmp_path)
            self.assertIsNotNone(result)
            self.assertIn("data", result)
            self.assertEqual(result["data"]["hash"], "abc123")
            self.assertIsNotNone(session.get_current())
            self.assertIsNotNone(session.get_manifest_path())
        finally:
            os.unlink(tmp_path)

    def test_clear_session(self):
        data = _make_manifest()
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False, encoding="utf-8"
        ) as f:
            json.dump(data, f)
            tmp_path = f.name
        try:
            session = RsdoctorSession()
            session.load(tmp_path)
            self.assertIsNotNone(session.get_current())
            session.clear()
            self.assertIsNone(session.get_current())
            self.assertIsNone(session.get_manifest_path())
        finally:
            os.unlink(tmp_path)

    def test_save_and_load_state(self):
        data = _make_manifest()
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False, encoding="utf-8"
        ) as f:
            json.dump(data, f)
            manifest_path = f.name

        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False, encoding="utf-8"
        ) as f:
            state_path = f.name

        try:
            session1 = RsdoctorSession()
            session1.load(manifest_path)
            session1.save_state(state_path)

            session2 = RsdoctorSession()
            session2.load_state(state_path)
            self.assertIsNotNone(session2.get_current())
            self.assertEqual(session2.get_current()["data"]["hash"], "abc123")
        finally:
            os.unlink(manifest_path)
            os.unlink(state_path)

    def test_save_state_without_load_raises(self):
        session = RsdoctorSession()
        with self.assertRaises(RuntimeError):
            session.save_state("/tmp/should_not_exist.json")

    def test_load_state_missing_file_raises(self):
        session = RsdoctorSession()
        with self.assertRaises(FileNotFoundError):
            session.load_state("/nonexistent/state.json")


# ---------------------------------------------------------------------------
# RsdoctorServerManager tests
# ---------------------------------------------------------------------------

class TestRsdoctorServerManager(unittest.TestCase):
    def setUp(self):
        # Use a temp state file to avoid polluting the real one
        self._state_file = tempfile.mktemp(suffix=".json")
        self.mgr = RsdoctorServerManager(state_file=self._state_file)

    def tearDown(self):
        if os.path.exists(self._state_file):
            os.unlink(self._state_file)

    def test_status_when_no_server_running(self):
        status = self.mgr.status()
        self.assertFalse(status["running"])
        self.assertIsNone(status["pid"])
        self.assertIsNone(status["port"])
        self.assertIsNone(status["url"])

    def test_stop_when_no_server(self):
        result = self.mgr.stop()
        self.assertFalse(result)

    def test_status_returns_dict(self):
        status = self.mgr.status()
        self.assertIsInstance(status, dict)
        self.assertIn("running", status)
        self.assertIn("pid", status)
        self.assertIn("port", status)
        self.assertIn("url", status)

    def test_write_and_read_state(self):
        state = {"pid": 99999, "port": 8090, "url": "http://localhost:8090"}
        self.mgr._write_state(state)
        read_back = self.mgr._read_state()
        self.assertEqual(read_back, state)

    def test_clear_state(self):
        state = {"pid": 99999, "port": 8090, "url": "http://localhost:8090"}
        self.mgr._write_state(state)
        self.mgr._clear_state()
        self.assertIsNone(self.mgr._read_state())

    def test_status_with_stale_pid(self):
        # Write a state with a PID that definitely doesn't exist (PID 1 is init,
        # we use a very large PID unlikely to exist and also expect it not to).
        # We use PID 999999 which almost certainly doesn't exist.
        state = {"pid": 999999, "port": 8090, "url": "http://localhost:8090"}
        self.mgr._write_state(state)
        status = self.mgr.status()
        # Should report not running since the PID doesn't exist
        self.assertFalse(status["running"])


if __name__ == "__main__":
    unittest.main()
