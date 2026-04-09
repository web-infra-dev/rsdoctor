import { describe, expect, it } from '@rstest/core';

import { getToolCatalog } from '../src/commands';
import { createRsdoctorCliToolExecutor } from '../src/executor';

describe('rsdoctor cli tool executor', () => {
  it('runs the mapped command and returns parsed json', async () => {
    const commands: string[][] = [];
    const catalog = getToolCatalog();
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
