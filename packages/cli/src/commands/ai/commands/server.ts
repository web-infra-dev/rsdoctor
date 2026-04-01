import { getDataFilePath } from '../datasource';

export async function getPort(): Promise<{
  ok: boolean;
  data: { mode: string; dataFile: string | null; note: string };
  description: string;
}> {
  const filePath = getDataFilePath();
  return {
    ok: true,
    data: {
      mode: 'json',
      dataFile: filePath,
      note: 'Using JSON data file mode. No server required.',
    },
    description: 'Get the JSON data file path used by the CLI.',
  };
}
