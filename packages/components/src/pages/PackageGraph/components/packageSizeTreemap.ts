import type { SDK } from '@rsdoctor/types';

export interface PackageSizeTreemapNode {
  id: string;
  name: string;
  packageName: string;
  version: string;
  value: number;
  percent: number;
  gzipSize: number;
  sourceSize: number;
}

export function buildPackageSizeTreemapData(
  packages: SDK.PackageData[],
): PackageSizeTreemapNode[] {
  const packagesWithSize = packages.filter((pkg) => pkg.size.parsedSize > 0);
  const totalSize = packagesWithSize.reduce(
    (total, pkg) => total + pkg.size.parsedSize,
    0,
  );

  if (totalSize === 0) {
    return [];
  }

  return packagesWithSize
    .map((pkg) => ({
      id: String(pkg.id),
      name: `${pkg.name}@${pkg.version}`,
      packageName: pkg.name,
      version: pkg.version,
      value: pkg.size.parsedSize,
      percent: (pkg.size.parsedSize / totalSize) * 100,
      gzipSize: pkg.size.gzipSize,
      sourceSize: pkg.size.sourceSize,
    }))
    .sort((a, b) => b.value - a.value);
}
