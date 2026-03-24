"""Table / JSON formatting helpers for CLI output."""
import json
import sys
from typing import Any, List, Optional

import click


def print_json(data: Any):
    """Print data as formatted JSON to stdout.

    Args:
        data: JSON-serializable Python object.
    """
    click.echo(json.dumps(data, indent=2, default=str))


def print_table(
    data: List[dict],
    columns: Optional[List[str]] = None,
    title: Optional[str] = None,
):
    """Print a list of dicts as a pretty table.

    Args:
        data: Rows to display.
        columns: Column keys to include (and their order).
        title: Optional title printed above the table.
    """
    if title:
        click.echo(f"\n{title}")
        click.echo("=" * len(title))

    if not data:
        click.echo("  (no results)")
        return

    try:
        from tabulate import tabulate  # type: ignore

        if columns:
            rows = [[row.get(col, "") for col in columns] for row in data]
            headers = columns
        else:
            headers = list(data[0].keys())
            rows = [[row.get(h, "") for h in headers] for row in data]

        click.echo(tabulate(rows, headers=headers, tablefmt="simple"))
    except ImportError:
        # Plain fallback
        if columns is None:
            columns = list(data[0].keys())
        widths = {col: len(str(col)) for col in columns}
        for row in data:
            for col in columns:
                widths[col] = max(widths[col], len(str(row.get(col, ""))))
        sep = "  "
        click.echo(sep.join(str(c).ljust(widths[c]) for c in columns))
        click.echo(sep.join("-" * widths[c] for c in columns))
        for row in data:
            click.echo(sep.join(str(row.get(c, "")).ljust(widths[c]) for c in columns))


def print_error(message: str, as_json: bool = False):
    """Print an error message.

    Args:
        message: Human-readable error description.
        as_json: If True, write JSON error object to stderr.
    """
    if as_json:
        click.echo(json.dumps({"error": message}), err=True)
    else:
        click.echo(f"Error: {message}", err=True)


def echo_or_json(human_text: str, data: Any, as_json: bool):
    """Either print human-readable text or JSON depending on the flag.

    Args:
        human_text: Text to display in non-JSON mode (already formatted).
        data: JSON-serializable object for JSON mode.
        as_json: Whether to emit JSON.
    """
    if as_json:
        print_json(data)
    else:
        click.echo(human_text)
