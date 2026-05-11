import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from '@rstest/core';
import { File } from '@rsdoctor/utils/build';
import { createSDK, type MockSDKResponse } from '../../utils';

describe('brief json output', () => {
  let target: MockSDKResponse;
  let outputDir: string;

  afterEach(async () => {
    if (target) await target.dispose();
    if (outputDir) await File.fse.remove(outputDir);
  });

  it('should write compact JSON without formatting whitespace', async () => {
    target = await createSDK({
      noServer: true,
      mode: 'brief',
      brief: {
        type: ['json'],
      },
    });
    outputDir = path.resolve(tmpdir(), `rsdoctor_brief_json_${Date.now()}`);
    target.sdk.setOutputDir(outputDir);

    await target.sdk.writeStore();

    const jsonDataPath = path.join(outputDir, 'rsdoctor-data.json');
    const content = fs.readFileSync(jsonDataPath, 'utf-8');

    expect(content).toBe(JSON.stringify(JSON.parse(content)));
  });
});
