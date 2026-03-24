"""Stateful session management for rsdoctor manifest data.

Load a manifest once and query it multiple times without re-parsing.
"""
import json
import os
from typing import Optional

from cli_anything.rsdoctor.core.manifest import ManifestLoader


class RsdoctorSession:
    """Stateful session - load manifest once, query multiple times."""

    def __init__(self):
        self._data: Optional[dict] = None
        self._manifest_path: Optional[str] = None
        self._loader = ManifestLoader()

    def load(self, manifest_path: str) -> dict:
        """Load a manifest file into the session.

        Args:
            manifest_path: Path to manifest.json.

        Returns:
            Parsed manifest data dict.
        """
        self._manifest_path = os.path.abspath(manifest_path)
        self._data = self._loader.load(manifest_path)
        return self._data

    def get_current(self) -> Optional[dict]:
        """Return currently loaded manifest data, or None if nothing loaded."""
        return self._data

    def get_manifest_path(self) -> Optional[str]:
        """Return the path of the currently loaded manifest."""
        return self._manifest_path

    def clear(self):
        """Clear the current session data."""
        self._data = None
        self._manifest_path = None

    def save_state(self, path: str):
        """Persist the session state to a JSON file.

        Args:
            path: Destination file path for the session state.

        Raises:
            RuntimeError: If no manifest is currently loaded.
        """
        if self._data is None:
            raise RuntimeError("No manifest loaded; nothing to save.")
        state = {
            "manifest_path": self._manifest_path,
            "data": self._data,
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2, default=str)

    def load_state(self, path: str):
        """Restore session state from a previously saved JSON file.

        Args:
            path: Path to a session state file created by save_state().

        Raises:
            FileNotFoundError: If the state file does not exist.
        """
        abs_path = os.path.abspath(path)
        if not os.path.exists(abs_path):
            raise FileNotFoundError(f"Session state file not found: {abs_path}")
        with open(abs_path, "r", encoding="utf-8") as f:
            state = json.load(f)
        self._manifest_path = state.get("manifest_path")
        self._data = state.get("data")
