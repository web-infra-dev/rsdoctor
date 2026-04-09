import { describe, expect, it } from '@rstest/core';

import { createRsdoctorToolCatalog } from '../src/tools/catalog';
import { createRsdoctorCliToolExecutor } from '../src/tools/rsdoctor-cli';

describe('rsdoctor cli tool executor', () => {
  it('runs the mapped command and returns parsed json', async () => {
    const commands: string[][] = [];
    const catalog = createRsdoctorToolCatalog();
    const executor = createRsdoctorCliToolExecutor({
      tools: catalog,
      runCommand: async (command) => {
        commands.push(command);
        return JSON.stringify({
          ok: true,
          data: { duplicatePackages: [] },
          description: 'bundle optimize',
        });
      },
    });

    const result = await executor.execute({
      toolName: 'bundle_optimize',
      input: {},
      dataFile: '/tmp/demo.json',
    });

    expect(commands).toEqual([
      [
        'rsdoctor-agent',
        'bundle',
        'optimize',
        '--data-file',
        '/tmp/demo.json',
        '--compact',
      ],
    ]);
    expect(result).toEqual({
      ok: true,
      data: { duplicatePackages: [] },
      description: 'bundle optimize',
    });
  });
});
