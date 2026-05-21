import { GlobalConfig } from '@rsdoctor/utils/common';
import { logger } from '@rsdoctor/utils/logger';
import fs from 'node:fs';

export function getPortFromArgs(): number {
  const args = process.argv.slice(2);
  const portIndex = args.indexOf('--port');
  const compilerIndex = args.indexOf('--compiler');
  if (portIndex !== -1 && args[portIndex + 1]) {
    return parseInt(args[portIndex + 1], 10);
  }
  if (portIndex === -1) {
    const port = getMcpPort(
      compilerIndex !== -1 ? args[compilerIndex + 1] : undefined,
    );
    if (port) {
      return port;
    }
  }

  return 3000;
}

export const getServerUrl = async () => {
  const port = getPortFromArgs();
  logger.error(`HTTP requests will use port: ${port}`);
  return `http://localhost:${port}`;
};

export const sendRequest = async (api: string, params = {}) => {
  const response = await fetch(`${await getServerUrl()}${api}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
};

export const getMcpPort = (compiler?: string) => {
  const mcpPortFilePath = GlobalConfig.getMcpConfigPath();

  if (!fs.existsSync(mcpPortFilePath)) {
    return undefined;
  }

  const mcpJson = JSON.parse(fs.readFileSync(mcpPortFilePath, 'utf8'));

  if (compiler) {
    const compilerPort = mcpJson.portList[compiler];
    if (compilerPort) {
      return compilerPort;
    }
  }

  return mcpJson.port;
};
