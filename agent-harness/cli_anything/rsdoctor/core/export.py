"""Format and export rsdoctor data in various output formats."""
import csv
import io
import json
from typing import Any, List, Optional


class DataExporter:
    """Serialize and present rsdoctor data in multiple formats."""

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------

    def to_json(self, data: Any) -> str:
        """Serialize data to a compact JSON string.

        Args:
            data: Any JSON-serializable Python object.

        Returns:
            Pretty-printed JSON string.
        """
        return json.dumps(data, indent=2, default=str)

    def to_table(self, data: List[dict], columns: Optional[List[str]] = None) -> str:
        """Render a list of dicts as an ASCII table.

        Args:
            data: List of row dicts.
            columns: Column names to include (and their order).  If None, all
                     keys from the first row are used.

        Returns:
            Formatted ASCII table string.
        """
        if not data:
            return "(no data)"

        try:
            from tabulate import tabulate  # type: ignore

            if columns:
                rows = [[row.get(col, "") for col in columns] for row in data]
                headers = columns
            else:
                headers = list(data[0].keys())
                rows = [[row.get(h, "") for h in headers] for row in data]

            return tabulate(rows, headers=headers, tablefmt="simple")
        except ImportError:
            # Fallback plain-text table if tabulate is not available
            return self._plain_table(data, columns)

    def to_csv(self, data: List[dict]) -> str:
        """Serialize a list of dicts to CSV.

        Args:
            data: List of row dicts (all rows must have the same keys).

        Returns:
            CSV string.
        """
        if not data:
            return ""
        buf = io.StringIO()
        headers = list(data[0].keys())
        writer = csv.DictWriter(buf, fieldnames=headers)
        writer.writeheader()
        writer.writerows(data)
        return buf.getvalue()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def format_size(self, num_bytes: int) -> str:
        """Format a byte count as a human-readable string.

        Args:
            num_bytes: Size in bytes.

        Returns:
            Human-readable string such as "1.2 MB", "456.0 KB", "12 B".
        """
        if num_bytes is None:
            return "0 B"
        try:
            num_bytes = int(num_bytes)
        except (TypeError, ValueError):
            return "0 B"

        if num_bytes < 1024:
            return f"{num_bytes} B"
        elif num_bytes < 1024 ** 2:
            return f"{num_bytes / 1024:.1f} KB"
        elif num_bytes < 1024 ** 3:
            return f"{num_bytes / 1024 ** 2:.1f} MB"
        else:
            return f"{num_bytes / 1024 ** 3:.1f} GB"

    def format_delta(self, delta: int) -> str:
        """Format a size delta with sign prefix.

        Args:
            delta: Signed byte count.

        Returns:
            String like "+1.2 MB", "-456.0 KB", "0 B".
        """
        if delta == 0:
            return "0 B"
        sign = "+" if delta > 0 else ""
        return f"{sign}{self.format_size(delta)}"

    def _plain_table(self, data: List[dict], columns: Optional[List[str]]) -> str:
        """Minimal table renderer used when tabulate is unavailable."""
        if columns is None:
            columns = list(data[0].keys())

        # Determine column widths
        widths = {col: len(str(col)) for col in columns}
        for row in data:
            for col in columns:
                widths[col] = max(widths[col], len(str(row.get(col, ""))))

        sep = "  "
        header = sep.join(str(col).ljust(widths[col]) for col in columns)
        divider = sep.join("-" * widths[col] for col in columns)
        lines = [header, divider]
        for row in data:
            lines.append(sep.join(str(row.get(col, "")).ljust(widths[col]) for col in columns))
        return "\n".join(lines)
