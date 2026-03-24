"""Load and parse rsdoctor manifest.json files.

Handles both inline data and sharded JSON files.
"""
import json
import os
import urllib.request
from typing import Any, Dict, List, Optional


class ManifestLoader:
    """Load and parse rsdoctor manifest JSON files."""

    def load(self, path: str) -> dict:
        """Load manifest, resolve shards if needed.

        Args:
            path: Path to manifest.json file or URL.

        Returns:
            Parsed manifest dict with top-level keys: client, data.
        """
        if path.startswith("http://") or path.startswith("https://"):
            with urllib.request.urlopen(path) as resp:
                raw = json.loads(resp.read().decode("utf-8"))
        else:
            abs_path = os.path.abspath(path)
            with open(abs_path, "r", encoding="utf-8") as f:
                raw = json.load(f)

        # Resolve sharded data if needed
        data = raw.get("data", {})
        if isinstance(data, str):
            # data is a URL pointing to actual data
            data = self._load_remote(data)
            raw["data"] = data
        elif isinstance(data, dict):
            # Resolve any sub-keys that are URLs (shards)
            base_dir = os.path.dirname(os.path.abspath(path)) if not path.startswith("http") else None
            for key, val in list(data.items()):
                if isinstance(val, str) and (val.startswith("http") or (base_dir and val.endswith(".json"))):
                    shard_data = self._load_shard(val, base_dir)
                    if shard_data is not None:
                        data[key] = shard_data

        return raw

    def _load_remote(self, url: str) -> dict:
        """Load JSON from a URL."""
        with urllib.request.urlopen(url) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def _load_shard(self, ref: str, base_dir: Optional[str]) -> Optional[Any]:
        """Load a shard file, either from URL or relative path."""
        try:
            if ref.startswith("http://") or ref.startswith("https://"):
                return self._load_remote(ref)
            elif base_dir:
                shard_path = os.path.join(base_dir, ref)
                if os.path.exists(shard_path):
                    with open(shard_path, "r", encoding="utf-8") as f:
                        return json.load(f)
        except Exception:
            pass
        return None

    def get_chunks(self, data: dict) -> List[dict]:
        """Extract chunk list with sizes.

        Args:
            data: Parsed manifest dict (top-level or data sub-dict).

        Returns:
            List of chunk dicts with id, name, size, initial, assets, modules.
        """
        inner = data.get("data", data)
        chunk_graph = inner.get("chunkGraph", {})
        if isinstance(chunk_graph, list):
            chunks = chunk_graph
        else:
            chunks = chunk_graph.get("chunks", [])
        result = []
        for chunk in chunks:
            if not isinstance(chunk, dict):
                result.append({"id": str(chunk), "name": "", "size": 0, "initial": False, "assets": [], "modules": []})
                continue
            result.append({
                "id": chunk.get("id", ""),
                "name": chunk.get("name", ""),
                "size": chunk.get("size", 0),
                "initial": chunk.get("initial", False),
                "assets": chunk.get("assets", []),
                "modules": chunk.get("modules", []),
            })
        return result

    def get_modules(self, data: dict) -> List[dict]:
        """Extract module list with sizes.

        Args:
            data: Parsed manifest dict.

        Returns:
            List of module dicts with id, path, sourceSize, transformedSize, parsedSize.
        """
        inner = data.get("data", data)
        module_graph = inner.get("moduleGraph", {})
        if isinstance(module_graph, list):
            modules = module_graph
        else:
            modules = module_graph.get("modules", [])
        result = []
        for mod in modules:
            if not isinstance(mod, dict):
                result.append({"id": str(mod), "path": "", "sourceSize": 0, "transformedSize": 0, "parsedSize": 0, "chunks": []})
                continue
            size_info = mod.get("size", {})
            if isinstance(size_info, dict):
                source_size = size_info.get("sourceSize", 0)
                transformed_size = size_info.get("transformedSize", 0)
                parsed_size = size_info.get("parsedSize", 0)
            else:
                source_size = size_info if isinstance(size_info, int) else 0
                transformed_size = 0
                parsed_size = 0
            result.append({
                "id": mod.get("id", ""),
                "path": mod.get("path", ""),
                "sourceSize": source_size,
                "transformedSize": transformed_size,
                "parsedSize": parsed_size,
                "chunks": mod.get("chunks", []),
            })
        return result

    def get_packages(self, data: dict) -> List[dict]:
        """Extract NPM package list.

        Args:
            data: Parsed manifest dict.

        Returns:
            List of package dicts with id, name, version, size.
        """
        inner = data.get("data", data)
        package_graph = inner.get("packageGraph", {})
        if isinstance(package_graph, list):
            packages = package_graph
        else:
            packages = package_graph.get("packages", [])
        result = []
        for pkg in packages:
            if not isinstance(pkg, dict):
                result.append({"id": str(pkg), "name": "", "version": "", "size": 0, "path": ""})
                continue
            result.append({
                "id": pkg.get("id", ""),
                "name": pkg.get("name", ""),
                "version": pkg.get("version", ""),
                "size": pkg.get("size", 0),
                "path": pkg.get("path", ""),
            })
        return result

    def get_assets(self, data: dict) -> List[dict]:
        """Extract output asset list.

        Args:
            data: Parsed manifest dict.

        Returns:
            List of asset dicts with path and size.
        """
        inner = data.get("data", data)
        chunk_graph = inner.get("chunkGraph", {})
        if isinstance(chunk_graph, list):
            assets = []
        else:
            assets = chunk_graph.get("assets", [])
        result = []
        for asset in assets:
            result.append({
                "path": asset.get("path", ""),
                "size": asset.get("size", 0),
            })
        return result

    def get_summary(self, data: dict) -> dict:
        """Build timing and build summary.

        Args:
            data: Parsed manifest dict.

        Returns:
            Dict with build timing costs and metadata.
        """
        inner = data.get("data", data)
        summary = inner.get("summary", {})
        costs = summary.get("costs", [])

        result = {
            "hash": inner.get("hash", ""),
            "root": inner.get("root", ""),
            "costs": costs,
        }

        # Compute total chunk count, module count etc. from graph data
        chunk_graph = inner.get("chunkGraph", {})
        module_graph = inner.get("moduleGraph", {})
        package_graph = inner.get("packageGraph", {})

        if isinstance(chunk_graph, list):
            result["chunkCount"] = len(chunk_graph)
            result["assetCount"] = 0
        else:
            result["chunkCount"] = len(chunk_graph.get("chunks", []))
            result["assetCount"] = len(chunk_graph.get("assets", []))
        result["moduleCount"] = len(module_graph.get("modules", [])) if isinstance(module_graph, dict) else len(module_graph)
        result["packageCount"] = len(package_graph.get("packages", [])) if isinstance(package_graph, dict) else len(package_graph)

        return result

    def get_routes(self, data: dict) -> List[str]:
        """Get enabled UI routes from manifest.

        Args:
            data: Parsed manifest dict.

        Returns:
            List of enabled route strings.
        """
        client = data.get("client", {})
        return client.get("enableRoutes", [])
