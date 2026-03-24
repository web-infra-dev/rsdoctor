"""Main Click CLI entry point for cli-anything-rsdoctor."""
import cmd
import json
import sys
from typing import Optional

import click

from cli_anything.rsdoctor.core.diff import BundleDiffer
from cli_anything.rsdoctor.core.export import DataExporter
from cli_anything.rsdoctor.core.manifest import ManifestLoader
from cli_anything.rsdoctor.core.server import RsdoctorServerManager
from cli_anything.rsdoctor.core.session import RsdoctorSession
from cli_anything.rsdoctor.utils.formatting import (
    echo_or_json,
    print_error,
    print_json,
    print_table,
)

# Shared singletons
_loader = ManifestLoader()
_exporter = DataExporter()
_differ = BundleDiffer()
_server_mgr = RsdoctorServerManager()


# ---------------------------------------------------------------------------
# Root group
# ---------------------------------------------------------------------------

@click.group()
@click.version_option(version="0.1.0", prog_name="cli-anything-rsdoctor")
def cli():
    """cli-anything-rsdoctor: CLI harness for rsdoctor build analyzer.

    Inspect rsdoctor manifest.json files, compare builds, and manage the
    rsdoctor analyze server.
    """


# ---------------------------------------------------------------------------
# manifest group
# ---------------------------------------------------------------------------

@cli.group("manifest")
def manifest_group():
    """Commands for inspecting manifest metadata."""


@manifest_group.command("info")
@click.argument("path")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON.")
def manifest_info(path: str, as_json: bool):
    """Show manifest metadata (hash, root, build counts).

    PATH is the path to a rsdoctor manifest.json file.
    """
    try:
        data = _loader.load(path)
    except Exception as exc:
        print_error(str(exc), as_json=as_json)
        sys.exit(1)

    inner = data.get("data", {})
    summary = _loader.get_summary(data)
    routes = _loader.get_routes(data)

    info = {
        "hash": inner.get("hash", ""),
        "root": inner.get("root", ""),
        "chunkCount": summary["chunkCount"],
        "moduleCount": summary["moduleCount"],
        "packageCount": summary["packageCount"],
        "assetCount": summary["assetCount"],
        "enabledRoutes": routes,
    }

    if as_json:
        print_json(info)
    else:
        click.echo(f"Hash         : {info['hash']}")
        click.echo(f"Root         : {info['root']}")
        click.echo(f"Chunks       : {info['chunkCount']}")
        click.echo(f"Modules      : {info['moduleCount']}")
        click.echo(f"Packages     : {info['packageCount']}")
        click.echo(f"Assets       : {info['assetCount']}")
        click.echo(f"Routes       : {', '.join(info['enabledRoutes']) or '(none)'}")


@manifest_group.command("routes")
@click.argument("path")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON.")
def manifest_routes(path: str, as_json: bool):
    """Show enabled UI routes in a manifest.

    PATH is the path to a rsdoctor manifest.json file.
    """
    try:
        data = _loader.load(path)
    except Exception as exc:
        print_error(str(exc), as_json=as_json)
        sys.exit(1)

    routes = _loader.get_routes(data)

    if as_json:
        print_json(routes)
    else:
        if routes:
            for r in routes:
                click.echo(f"  {r}")
        else:
            click.echo("  (no routes found)")


# ---------------------------------------------------------------------------
# bundle group
# ---------------------------------------------------------------------------

@cli.group("bundle")
def bundle_group():
    """Commands for inspecting bundle contents."""


@bundle_group.command("chunks")
@click.argument("path")
@click.option("--top", default=0, help="Show only top N chunks by size (0 = all).")
@click.option("--min-size", default=0, help="Minimum size in bytes to include.")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON.")
def bundle_chunks(path: str, top: int, min_size: int, as_json: bool):
    """List chunks with sizes from a manifest.

    PATH is the path to a rsdoctor manifest.json file.
    """
    try:
        data = _loader.load(path)
    except Exception as exc:
        print_error(str(exc), as_json=as_json)
        sys.exit(1)

    chunks = _loader.get_chunks(data)
    chunks = sorted(chunks, key=lambda c: c.get("size", 0), reverse=True)

    if min_size > 0:
        chunks = [c for c in chunks if c.get("size", 0) >= min_size]
    if top > 0:
        chunks = chunks[:top]

    if as_json:
        print_json(chunks)
    else:
        display = [
            {
                "id": c["id"],
                "name": c["name"],
                "size": _exporter.format_size(c.get("size", 0)),
                "initial": c.get("initial", False),
                "assets": len(c.get("assets", [])),
                "modules": len(c.get("modules", [])),
            }
            for c in chunks
        ]
        print_table(display, columns=["id", "name", "size", "initial", "assets", "modules"],
                    title=f"Chunks ({len(display)})")


@bundle_group.command("modules")
@click.argument("path")
@click.option("--top", default=0, help="Show only top N modules by size (0 = all).")
@click.option("--chunk", default=None, help="Filter by chunk ID.")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON.")
def bundle_modules(path: str, top: int, chunk: Optional[str], as_json: bool):
    """List modules with sizes from a manifest.

    PATH is the path to a rsdoctor manifest.json file.
    """
    try:
        data = _loader.load(path)
    except Exception as exc:
        print_error(str(exc), as_json=as_json)
        sys.exit(1)

    modules = _loader.get_modules(data)

    if chunk:
        modules = [m for m in modules if chunk in m.get("chunks", [])]

    modules = sorted(modules, key=lambda m: m.get("parsedSize", m.get("transformedSize", 0)), reverse=True)

    if top > 0:
        modules = modules[:top]

    if as_json:
        print_json(modules)
    else:
        display = [
            {
                "id": m["id"][:8] + "..." if len(m.get("id", "")) > 11 else m.get("id", ""),
                "path": m.get("path", "")[-60:] if len(m.get("path", "")) > 60 else m.get("path", ""),
                "sourceSize": _exporter.format_size(m.get("sourceSize", 0)),
                "parsedSize": _exporter.format_size(m.get("parsedSize", 0)),
            }
            for m in modules
        ]
        print_table(display, columns=["id", "path", "sourceSize", "parsedSize"],
                    title=f"Modules ({len(display)})")


@bundle_group.command("packages")
@click.argument("path")
@click.option("--top", default=0, help="Show only top N packages by size (0 = all).")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON.")
def bundle_packages(path: str, top: int, as_json: bool):
    """List NPM packages from a manifest.

    PATH is the path to a rsdoctor manifest.json file.
    """
    try:
        data = _loader.load(path)
    except Exception as exc:
        print_error(str(exc), as_json=as_json)
        sys.exit(1)

    packages = _loader.get_packages(data)
    packages = sorted(packages, key=lambda p: p.get("size", 0), reverse=True)

    if top > 0:
        packages = packages[:top]

    if as_json:
        print_json(packages)
    else:
        display = [
            {
                "name": p.get("name", ""),
                "version": p.get("version", ""),
                "size": _exporter.format_size(p.get("size", 0)),
            }
            for p in packages
        ]
        print_table(display, columns=["name", "version", "size"],
                    title=f"Packages ({len(display)})")


@bundle_group.command("assets")
@click.argument("path")
@click.option("--top", default=0, help="Show only top N assets by size (0 = all).")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON.")
def bundle_assets(path: str, top: int, as_json: bool):
    """List output assets from a manifest.

    PATH is the path to a rsdoctor manifest.json file.
    """
    try:
        data = _loader.load(path)
    except Exception as exc:
        print_error(str(exc), as_json=as_json)
        sys.exit(1)

    assets = _loader.get_assets(data)
    assets = sorted(assets, key=lambda a: a.get("size", 0), reverse=True)

    if top > 0:
        assets = assets[:top]

    if as_json:
        print_json(assets)
    else:
        display = [
            {
                "path": a.get("path", "")[-70:],
                "size": _exporter.format_size(a.get("size", 0)),
            }
            for a in assets
        ]
        print_table(display, columns=["path", "size"],
                    title=f"Assets ({len(display)})")


@bundle_group.command("large")
@click.argument("path")
@click.option("--threshold", default=100_000,
              help="Minimum size in bytes to flag as large (default: 100000).")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON.")
def bundle_large(path: str, threshold: int, as_json: bool):
    """Find large chunks, modules, and assets above the threshold.

    PATH is the path to a rsdoctor manifest.json file.
    """
    try:
        data = _loader.load(path)
    except Exception as exc:
        print_error(str(exc), as_json=as_json)
        sys.exit(1)

    chunks = [c for c in _loader.get_chunks(data) if c.get("size", 0) >= threshold]
    modules = [m for m in _loader.get_modules(data)
               if m.get("parsedSize", m.get("transformedSize", 0)) >= threshold]
    assets = [a for a in _loader.get_assets(data) if a.get("size", 0) >= threshold]

    result = {
        "threshold": threshold,
        "large_chunks": sorted(chunks, key=lambda c: c.get("size", 0), reverse=True),
        "large_modules": sorted(modules,
                                key=lambda m: m.get("parsedSize", m.get("transformedSize", 0)),
                                reverse=True),
        "large_assets": sorted(assets, key=lambda a: a.get("size", 0), reverse=True),
    }

    if as_json:
        print_json(result)
    else:
        click.echo(f"Threshold: {_exporter.format_size(threshold)}\n")
        click.echo(f"Large chunks ({len(result['large_chunks'])}):")
        for c in result["large_chunks"]:
            click.echo(f"  {c['name']} ({c['id']}): {_exporter.format_size(c.get('size', 0))}")

        click.echo(f"\nLarge modules ({len(result['large_modules'])}):")
        for m in result["large_modules"][:10]:
            size = m.get("parsedSize", m.get("transformedSize", 0))
            click.echo(f"  {m.get('path', m['id'])}: {_exporter.format_size(size)}")

        click.echo(f"\nLarge assets ({len(result['large_assets'])}):")
        for a in result["large_assets"]:
            click.echo(f"  {a['path']}: {_exporter.format_size(a.get('size', 0))}")


@bundle_group.command("duplicates")
@click.argument("path")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON.")
def bundle_duplicates(path: str, as_json: bool):
    """Find duplicate NPM packages (same name, different versions).

    PATH is the path to a rsdoctor manifest.json file.
    """
    try:
        data = _loader.load(path)
    except Exception as exc:
        print_error(str(exc), as_json=as_json)
        sys.exit(1)

    packages = _loader.get_packages(data)

    # Group by name
    by_name: dict = {}
    for pkg in packages:
        name = pkg.get("name", "")
        by_name.setdefault(name, []).append(pkg)

    duplicates = {name: pkgs for name, pkgs in by_name.items() if len(pkgs) > 1}

    if as_json:
        print_json(duplicates)
    else:
        if not duplicates:
            click.echo("No duplicate packages found.")
            return
        click.echo(f"Duplicate packages ({len(duplicates)} names):\n")
        for name, pkgs in sorted(duplicates.items()):
            click.echo(f"  {name}")
            for pkg in pkgs:
                click.echo(f"    v{pkg.get('version', '?')}  {_exporter.format_size(pkg.get('size', 0))}")


# ---------------------------------------------------------------------------
# diff group
# ---------------------------------------------------------------------------

@cli.group("diff")
def diff_group():
    """Commands for comparing two build manifests."""


@diff_group.command("compare")
@click.argument("current")
@click.argument("baseline")
@click.option("--format", "fmt", type=click.Choice(["json", "table"]), default="table",
              help="Output format (json or table).")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON (same as --format json).")
def diff_compare(current: str, baseline: str, fmt: str, as_json: bool):
    """Compare two rsdoctor manifests.

    CURRENT is the new build manifest.
    BASELINE is the reference manifest.
    """
    try:
        cur_data = _loader.load(current)
        base_data = _loader.load(baseline)
    except Exception as exc:
        print_error(str(exc), as_json=as_json)
        sys.exit(1)

    result = _differ.compare(cur_data, base_data)

    if as_json or fmt == "json":
        print_json(result)
    else:
        summary = _differ.summarize(result)
        click.echo("Bundle Diff Summary")
        click.echo("=" * 40)
        click.echo(f"Total size delta : {_exporter.format_delta(summary['total_size_delta'])}")
        click.echo(f"Chunk delta      : {summary['chunk_count_delta']:+d}")
        click.echo(f"Module delta     : {summary['module_count_delta']:+d}")
        click.echo(f"Package delta    : {summary['package_count_delta']:+d}")

        if result["changed_chunks"]:
            click.echo("\nChanged chunks:")
            for c in result["changed_chunks"]:
                click.echo(
                    f"  {c['name']} ({c['id']}): "
                    f"{_exporter.format_size(c['baselineSize'])} -> "
                    f"{_exporter.format_size(c['currentSize'])} "
                    f"({_exporter.format_delta(c['delta'])})"
                )

        if result["added_chunks"]:
            click.echo("\nAdded chunks:")
            for c in result["added_chunks"]:
                click.echo(f"  + {c['name']} ({c['id']}): {_exporter.format_size(c.get('size', 0))}")

        if result["removed_chunks"]:
            click.echo("\nRemoved chunks:")
            for c in result["removed_chunks"]:
                click.echo(f"  - {c['name']} ({c['id']}): {_exporter.format_size(c.get('size', 0))}")


@diff_group.command("summary")
@click.argument("current")
@click.argument("baseline")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON.")
def diff_summary(current: str, baseline: str, as_json: bool):
    """Show high-level diff summary stats between two manifests.

    CURRENT is the new build manifest.
    BASELINE is the reference manifest.
    """
    try:
        cur_data = _loader.load(current)
        base_data = _loader.load(baseline)
    except Exception as exc:
        print_error(str(exc), as_json=as_json)
        sys.exit(1)

    result = _differ.compare(cur_data, base_data)
    summary = _differ.summarize(result)

    if as_json:
        print_json(summary)
    else:
        click.echo(f"Total size delta    : {_exporter.format_delta(summary['total_size_delta'])}")
        click.echo(f"Current total size  : {_exporter.format_size(summary['current_total_size'])}")
        click.echo(f"Baseline total size : {_exporter.format_size(summary['baseline_total_size'])}")
        click.echo(f"Chunk count delta   : {summary['chunk_count_delta']:+d}")
        click.echo(f"Module count delta  : {summary['module_count_delta']:+d}")
        click.echo(f"Package count delta : {summary['package_count_delta']:+d}")
        click.echo(f"Changed chunks      : {summary['changed_chunks_count']}")
        click.echo(f"Changed modules     : {summary['changed_modules_count']}")


# ---------------------------------------------------------------------------
# server group
# ---------------------------------------------------------------------------

@cli.group("server")
def server_group():
    """Commands for managing the rsdoctor analyze server."""


@server_group.command("start")
@click.argument("path")
@click.option("--port", default=8090, help="Port to run the server on (default: 8090).")
@click.option("--bg", is_flag=True, help="Run in background (detached).")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON.")
def server_start(path: str, port: int, bg: bool, as_json: bool):
    """Start the rsdoctor analyze server.

    PATH is the path to a rsdoctor manifest.json file.
    """
    try:
        result = _server_mgr.start(path, port=port)
    except RuntimeError as exc:
        print_error(str(exc), as_json=as_json)
        sys.exit(1)

    if as_json:
        print_json(result)
    else:
        click.echo(f"Server started (PID {result['pid']}) at {result['url']}")


@server_group.command("stop")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON.")
def server_stop(as_json: bool):
    """Stop the running rsdoctor server."""
    stopped = _server_mgr.stop()
    result = {"stopped": stopped}

    if as_json:
        print_json(result)
    else:
        if stopped:
            click.echo("Server stopped.")
        else:
            click.echo("No server was running.")


@server_group.command("status")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON.")
def server_status(as_json: bool):
    """Show the running status of the rsdoctor server."""
    status = _server_mgr.status()

    if as_json:
        print_json(status)
    else:
        if status["running"]:
            click.echo(f"Server is running  (PID {status['pid']}, port {status['port']})")
            click.echo(f"URL: {status['url']}")
        else:
            click.echo("Server is not running.")


# ---------------------------------------------------------------------------
# shell (REPL)
# ---------------------------------------------------------------------------

class RsdoctorREPL(cmd.Cmd):
    """Interactive REPL for rsdoctor."""

    intro = (
        "Welcome to cli-anything-rsdoctor shell.\n"
        "Type 'help' for a list of commands, 'quit' to exit.\n"
    )
    prompt = "rsdoctor> "

    def __init__(self):
        super().__init__()
        self._session = RsdoctorSession()

    # ------------------------------------------------------------------
    # Commands
    # ------------------------------------------------------------------

    def do_load(self, arg: str):
        """Load a manifest file.  Usage: load <path>"""
        path = arg.strip()
        if not path:
            print("Usage: load <path>")
            return
        try:
            self._session.load(path)
            data = self._session.get_current()
            summary = _loader.get_summary(data)
            print(
                f"Loaded: {path}\n"
                f"  hash={summary['hash']}, "
                f"chunks={summary['chunkCount']}, "
                f"modules={summary['moduleCount']}, "
                f"packages={summary['packageCount']}"
            )
        except Exception as exc:
            print(f"Error: {exc}")

    def do_info(self, arg: str):
        """Show metadata for the loaded manifest.  Usage: info"""
        data = self._session.get_current()
        if data is None:
            print("No manifest loaded.  Use: load <path>")
            return
        summary = _loader.get_summary(data)
        routes = _loader.get_routes(data)
        print(f"Hash     : {summary['hash']}")
        print(f"Root     : {summary['root']}")
        print(f"Chunks   : {summary['chunkCount']}")
        print(f"Modules  : {summary['moduleCount']}")
        print(f"Packages : {summary['packageCount']}")
        print(f"Assets   : {summary['assetCount']}")
        print(f"Routes   : {', '.join(routes) or '(none)'}")

    def do_chunks(self, arg: str):
        """List chunks.  Usage: chunks [--top N]"""
        data = self._session.get_current()
        if data is None:
            print("No manifest loaded.  Use: load <path>")
            return
        top = self._parse_top(arg)
        chunks = sorted(_loader.get_chunks(data), key=lambda c: c.get("size", 0), reverse=True)
        if top:
            chunks = chunks[:top]
        rows = [
            {"id": c["id"], "name": c["name"],
             "size": _exporter.format_size(c.get("size", 0)),
             "initial": c.get("initial", False)}
            for c in chunks
        ]
        print_table(rows, columns=["id", "name", "size", "initial"])

    def do_modules(self, arg: str):
        """List modules.  Usage: modules [--top N]"""
        data = self._session.get_current()
        if data is None:
            print("No manifest loaded.  Use: load <path>")
            return
        top = self._parse_top(arg)
        modules = sorted(
            _loader.get_modules(data),
            key=lambda m: m.get("parsedSize", m.get("transformedSize", 0)),
            reverse=True,
        )
        if top:
            modules = modules[:top]
        rows = [
            {"id": m["id"][:12], "path": m.get("path", "")[-50:],
             "size": _exporter.format_size(m.get("parsedSize", m.get("transformedSize", 0)))}
            for m in modules
        ]
        print_table(rows, columns=["id", "path", "size"])

    def do_packages(self, arg: str):
        """List packages.  Usage: packages [--top N]"""
        data = self._session.get_current()
        if data is None:
            print("No manifest loaded.  Use: load <path>")
            return
        top = self._parse_top(arg)
        packages = sorted(_loader.get_packages(data), key=lambda p: p.get("size", 0), reverse=True)
        if top:
            packages = packages[:top]
        rows = [
            {"name": p.get("name", ""), "version": p.get("version", ""),
             "size": _exporter.format_size(p.get("size", 0))}
            for p in packages
        ]
        print_table(rows, columns=["name", "version", "size"])

    def do_quit(self, arg: str):
        """Exit the shell."""
        print("Bye!")
        return True

    def do_exit(self, arg: str):
        """Exit the shell."""
        return self.do_quit(arg)

    def do_EOF(self, arg: str):
        """Exit on Ctrl-D."""
        print()
        return self.do_quit(arg)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _parse_top(self, arg: str) -> int:
        """Parse --top N from argument string, return N or 0."""
        parts = arg.split()
        for i, part in enumerate(parts):
            if part == "--top" and i + 1 < len(parts):
                try:
                    return int(parts[i + 1])
                except ValueError:
                    pass
        return 0


@cli.command("shell")
def shell_cmd():
    """Start an interactive REPL session."""
    RsdoctorREPL().cmdloop()


# ---------------------------------------------------------------------------
# Entry point guard
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    cli()
