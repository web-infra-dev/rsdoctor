import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Get the root directory of a monorepo or single repository
 * @param {string} startPath - The starting path (usually a subpackage or any folder)
 * @returns {string|null} The root directory path, or null if not found
 */
export function findRepoRoot(startPath?: string) {
  let dir = path.resolve(startPath ?? process.cwd());

  while (dir !== path.dirname(dir)) {
    // 1. Lerna
    if (fs.existsSync(path.join(dir, 'lerna.json'))) return dir;
    // 2. pnpm
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    // 3. Yarn/NPM workspaces
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.workspaces) return dir;
    }
    // 4. lock file (single repository may also have)
    if (
      fs.existsSync(path.join(dir, 'yarn.lock')) ||
      fs.existsSync(path.join(dir, 'pnpm-lock.yaml')) ||
      fs.existsSync(path.join(dir, 'package-lock.json'))
    ) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

/**
 * @description Writes the builder port information to mcp.json.
 *
 * The mcp.json file uses the following format:
 * {
 *   portList: {
 *     builder1: portNumber,
 *     builder2: portNumber,
 *   },
 *   port: portNumber // The port of the last builder is used by default
 * }
 *
 * @param {number} port - The port number to write.
 * @param {string} [builderName] - The name of the builder.
 */
export function writeMcpPort(port: number, builderName?: string) {
  const homeDir = os.homedir();
  const rsdoctorDir = path.join(homeDir, '.cache/rsdoctor');
  const mcpPortFilePath = path.join(rsdoctorDir, 'mcp.json');

  if (!fs.existsSync(rsdoctorDir)) {
    fs.mkdirSync(rsdoctorDir, { recursive: true });
  }

  let mcpJson: { portList: Record<string, number>; port: number } = {
    portList: {},
    port: 0,
  };
  if (fs.existsSync(mcpPortFilePath)) {
    mcpJson = JSON.parse(fs.readFileSync(mcpPortFilePath, 'utf8'));
  }

  if (!mcpJson.portList) mcpJson.portList = {};
  mcpJson.portList[builderName || 'builder'] = port;

  // Use the latest generated port.
  mcpJson.port = port;

  fs.writeFileSync(mcpPortFilePath, JSON.stringify(mcpJson, null, 2), 'utf8');
}

/**
 * @description Gets the path to the mcp.json file.
 * @returns {string} The path to the mcp.json file.
 */
export function getMcpConfigPath() {
  const homeDir = os.homedir();
  const rsdoctorDir = path.join(homeDir, '.cache/rsdoctor');
  const mcpPortFilePath = path.join(rsdoctorDir, 'mcp.json');
  return mcpPortFilePath;
}
