import { describe, expect, it } from '@rstest/core';
import type { SDK } from '@rsdoctor/types';
import { buildPackageSizeTreemapData } from './packageSizeTreemap';

function createPackage(
  partial: Pick<SDK.PackageData, 'id' | 'name' | 'version'> & {
    parsedSize: number;
    gzipSize?: number;
    sourceSize?: number;
  },
): SDK.PackageData {
  return {
    id: partial.id,
    name: partial.name,
    version: partial.version,
    root: `/node_modules/${partial.name}`,
    modules: [],
    size: {
      parsedSize: partial.parsedSize,
      gzipSize: partial.gzipSize ?? 0,
      sourceSize: partial.sourceSize ?? 0,
      transformedSize: 0,
    },
  };
}

describe('buildPackageSizeTreemapData', () => {
  it('sorts packages by parsed size and adds package size percentage', () => {
    const data = buildPackageSizeTreemapData([
      createPackage({
        id: 1,
        name: 'small',
        version: '1.0.0',
        parsedSize: 25,
      }),
      createPackage({
        id: 2,
        name: 'large',
        version: '1.0.0',
        parsedSize: 75,
        gzipSize: 30,
      }),
    ]);

    expect(data).toStrictEqual([
      {
        id: '2',
        name: 'large@1.0.0',
        packageName: 'large',
        version: '1.0.0',
        value: 75,
        percent: 75,
        gzipSize: 30,
        sourceSize: 0,
      },
      {
        id: '1',
        name: 'small@1.0.0',
        packageName: 'small',
        version: '1.0.0',
        value: 25,
        percent: 25,
        gzipSize: 0,
        sourceSize: 0,
      },
    ]);
  });

  it('filters packages without parsed size', () => {
    const data = buildPackageSizeTreemapData([
      createPackage({
        id: 1,
        name: 'empty',
        version: '1.0.0',
        parsedSize: 0,
      }),
    ]);

    expect(data).toStrictEqual([]);
  });
});
