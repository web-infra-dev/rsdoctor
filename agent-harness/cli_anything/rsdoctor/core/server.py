"""Manage rsdoctor Node.js server process."""
import json
import os
import shutil
import signal
import subprocess
import tempfile
import time
from typing import Optional


_STATE_FILE = os.path.join(tempfile.gettempdir(), "rsdoctor_server_state.json")


class RsdoctorServerManager:
    """Start and stop the rsdoctor analyze server."""

    def __init__(self, state_file: str = _STATE_FILE):
        self._state_file = state_file
        self._process: Optional[subprocess.Popen] = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def start(self, manifest_path: str, port: int = 8090) -> dict:
        """Start rsdoctor analyze server.

        Args:
            manifest_path: Path to the manifest.json to serve.
            port: TCP port for the server (default 8090).

        Returns:
            Dict with pid, port, url.

        Raises:
            RuntimeError: If the rsdoctor binary cannot be found or the server
                          fails to start.
        """
        binary = self._find_rsdoctor_binary()
        abs_path = os.path.abspath(manifest_path)

        cmd = [binary, "analyze", abs_path, "--port", str(port), "--no-open"]
        try:
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
        except FileNotFoundError as exc:
            raise RuntimeError(f"Failed to start rsdoctor: {exc}") from exc

        # Give the server a moment to start
        time.sleep(1)

        if proc.poll() is not None:
            _, stderr = proc.communicate()
            raise RuntimeError(f"rsdoctor server exited immediately: {stderr}")

        url = f"http://localhost:{port}"
        state = {"pid": proc.pid, "port": port, "url": url}
        self._write_state(state)
        self._process = proc
        return state

    def stop(self) -> bool:
        """Stop the running server.

        Returns:
            True if the server was stopped, False if it was not running.
        """
        state = self._read_state()
        if not state:
            return False

        pid = state.get("pid")
        stopped = False
        if pid:
            try:
                os.kill(pid, signal.SIGTERM)
                stopped = True
                # Wait briefly for graceful shutdown
                time.sleep(0.5)
                try:
                    os.kill(pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
            except ProcessLookupError:
                stopped = True  # Already gone

        if self._process is not None:
            try:
                self._process.terminate()
                self._process.wait(timeout=5)
            except Exception:
                pass
            self._process = None

        self._clear_state()
        return stopped

    def status(self) -> dict:
        """Return server status.

        Returns:
            Dict with running (bool), pid, port, url.
        """
        state = self._read_state()
        if not state:
            return {"running": False, "pid": None, "port": None, "url": None}

        pid = state.get("pid")
        running = False
        if pid:
            try:
                os.kill(pid, 0)  # Signal 0 checks if process exists
                running = True
            except (ProcessLookupError, PermissionError):
                running = False

        if not running:
            self._clear_state()
            return {"running": False, "pid": None, "port": None, "url": None}

        return {
            "running": True,
            "pid": pid,
            "port": state.get("port"),
            "url": state.get("url"),
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _find_rsdoctor_binary(self) -> str:
        """Find the rsdoctor CLI binary.

        Searches (in order):
        1. PATH
        2. ./node_modules/.bin/rsdoctor (relative to cwd)
        3. Common global npm/npx locations

        Returns:
            Absolute path to the rsdoctor binary.

        Raises:
            RuntimeError: If the binary cannot be found.
        """
        # 1. Try PATH
        found = shutil.which("rsdoctor")
        if found:
            return found

        # 2. Try local node_modules
        local = os.path.join(os.getcwd(), "node_modules", ".bin", "rsdoctor")
        if os.path.isfile(local) and os.access(local, os.X_OK):
            return local

        # 3. Try npx as fallback
        npx = shutil.which("npx")
        if npx:
            return f"{npx} rsdoctor"

        raise RuntimeError(
            "rsdoctor binary not found. "
            "Install it with: npm install -g @rsdoctor/cli  "
            "or add it to your project's devDependencies."
        )

    def _write_state(self, state: dict):
        with open(self._state_file, "w", encoding="utf-8") as f:
            json.dump(state, f)

    def _read_state(self) -> Optional[dict]:
        if not os.path.exists(self._state_file):
            return None
        try:
            with open(self._state_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return None

    def _clear_state(self):
        if os.path.exists(self._state_file):
            try:
                os.remove(self._state_file)
            except OSError:
                pass
