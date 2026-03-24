"""Bundle diff operations - compare two rsdoctor manifests."""
from typing import Any, Dict, List, Optional

from cli_anything.rsdoctor.core.manifest import ManifestLoader


class BundleDiffer:
    """Compare two rsdoctor manifests and produce a structured diff."""

    def __init__(self):
        self._loader = ManifestLoader()

    def compare(self, current: dict, baseline: dict) -> dict:
        """Compare current manifest data against a baseline.

        Args:
            current: Parsed manifest dict for the current build.
            baseline: Parsed manifest dict for the baseline build.

        Returns:
            Dict containing:
                added_chunks: chunks in current but not in baseline
                removed_chunks: chunks in baseline but not in current
                changed_chunks: chunks in both with different sizes
                added_modules: modules in current but not in baseline
                removed_modules: modules in baseline but not in current
                changed_modules: modules in both with different sizes
                added_packages: packages in current but not in baseline
                removed_packages: packages in baseline but not in current
                size_delta: total size change in bytes
        """
        cur_chunks = {c["id"]: c for c in self._loader.get_chunks(current)}
        base_chunks = {c["id"]: c for c in self._loader.get_chunks(baseline)}

        cur_modules = {m["id"]: m for m in self._loader.get_modules(current)}
        base_modules = {m["id"]: m for m in self._loader.get_modules(baseline)}

        cur_packages = {p["name"]: p for p in self._loader.get_packages(current)}
        base_packages = {p["name"]: p for p in self._loader.get_packages(baseline)}

        added_chunks = [cur_chunks[k] for k in cur_chunks if k not in base_chunks]
        removed_chunks = [base_chunks[k] for k in base_chunks if k not in cur_chunks]
        changed_chunks = []
        for k in cur_chunks:
            if k in base_chunks:
                cur_size = cur_chunks[k].get("size", 0)
                base_size = base_chunks[k].get("size", 0)
                if cur_size != base_size:
                    changed_chunks.append({
                        "id": k,
                        "name": cur_chunks[k].get("name", ""),
                        "currentSize": cur_size,
                        "baselineSize": base_size,
                        "delta": cur_size - base_size,
                    })

        added_modules = [cur_modules[k] for k in cur_modules if k not in base_modules]
        removed_modules = [base_modules[k] for k in base_modules if k not in cur_modules]
        changed_modules = []
        for k in cur_modules:
            if k in base_modules:
                cur_size = cur_modules[k].get("parsedSize", cur_modules[k].get("transformedSize", 0))
                base_size = base_modules[k].get("parsedSize", base_modules[k].get("transformedSize", 0))
                if cur_size != base_size:
                    changed_modules.append({
                        "id": k,
                        "path": cur_modules[k].get("path", ""),
                        "currentSize": cur_size,
                        "baselineSize": base_size,
                        "delta": cur_size - base_size,
                    })

        added_packages = [cur_packages[k] for k in cur_packages if k not in base_packages]
        removed_packages = [base_packages[k] for k in base_packages if k not in cur_packages]

        # Compute total size delta across all chunks
        cur_total = sum(c.get("size", 0) for c in cur_chunks.values())
        base_total = sum(c.get("size", 0) for c in base_chunks.values())
        size_delta = cur_total - base_total

        return {
            "added_chunks": added_chunks,
            "removed_chunks": removed_chunks,
            "changed_chunks": changed_chunks,
            "added_modules": added_modules,
            "removed_modules": removed_modules,
            "changed_modules": changed_modules,
            "added_packages": added_packages,
            "removed_packages": removed_packages,
            "size_delta": size_delta,
            "current_total_size": cur_total,
            "baseline_total_size": base_total,
        }

    def summarize(self, diff_result: dict) -> dict:
        """Produce a high-level summary of a diff result.

        Args:
            diff_result: Output from compare().

        Returns:
            Dict with:
                total_size_delta: bytes added/removed overall
                chunk_count_delta: net change in chunk count
                module_count_delta: net change in module count
                package_count_delta: net change in package count
        """
        chunk_count_delta = (
            len(diff_result.get("added_chunks", []))
            - len(diff_result.get("removed_chunks", []))
        )
        module_count_delta = (
            len(diff_result.get("added_modules", []))
            - len(diff_result.get("removed_modules", []))
        )
        package_count_delta = (
            len(diff_result.get("added_packages", []))
            - len(diff_result.get("removed_packages", []))
        )

        return {
            "total_size_delta": diff_result.get("size_delta", 0),
            "current_total_size": diff_result.get("current_total_size", 0),
            "baseline_total_size": diff_result.get("baseline_total_size", 0),
            "chunk_count_delta": chunk_count_delta,
            "module_count_delta": module_count_delta,
            "package_count_delta": package_count_delta,
            "changed_chunks_count": len(diff_result.get("changed_chunks", [])),
            "changed_modules_count": len(diff_result.get("changed_modules", [])),
        }
