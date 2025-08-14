import { describe, expect, it } from '@rstest/core';

/**
 * create sandbox to load src/multiple.ts to avoid sdk save in global variable between different test cases.
 */
async function loadMultipleFile() {
  // @ts-ignore
  let multiple = await import('../dist/index.mjs');
  return multiple!;
}

describe('test src/multiple.ts', () => {
  describe('test stage options', () => {
    it('with stage', async () => {
      const { RsdoctorWebpackMultiplePlugin } = await loadMultipleFile();
      const plugin1 = new RsdoctorWebpackMultiplePlugin({
        name: 'Hello1',
        stage: 0,
      });
      const plugin2 = new RsdoctorWebpackMultiplePlugin({
        name: 'Hello2',
        stage: -2,
      });
      const plugin3 = new RsdoctorWebpackMultiplePlugin({
        name: 'Hello3',
        stage: -1,
      });

      // @ts-ignore
      const result = plugin1.controller
        .getSeriesData()
        .map((e: any) => ({ name: e.name, stage: e.stage }));

      expect(result).toStrictEqual([
        { name: 'Hello2', stage: -2 },
        { name: 'Hello3', stage: -1 },
        { name: 'Hello1', stage: 0 },
      ]);
    });
  });
});
