import { summary } from '@actions/core';
import * as fs from 'fs';

export interface SizeData {
  totalSize: number;
  files: Array<{
    path: string;
    size: number;
    gzipSize?: number;
    brotliSize?: number;
  }>;
}

export interface RsdoctorData {
  data: {
    chunkGraph: {
      assets: Array<{
        id: number;
        path: string;
        size: number;
        chunks: string[];
      }>;
      chunks: Array<{
        id: string;
        name: string;
        initial: boolean;
        size: number;
        assets: string[];
      }>;
    };
  };
}

export interface BundleAnalysis {
  totalSize: number;
  jsSize: number;
  cssSize: number;
  htmlSize: number;
  otherSize: number;
  assets: Array<{
    path: string;
    size: number;
    type: 'js' | 'css' | 'html' | 'other';
  }>;
  chunks: Array<{
    name: string;
    size: number;
    isInitial: boolean;
  }>;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];

  const isNegative = bytes < 0;
  const absBytes = Math.abs(bytes);

  if (absBytes === 0) return '0 B';

  const i = Math.floor(Math.log(absBytes) / Math.log(k));
  const value = (absBytes / Math.pow(k, i)).toFixed(1);

  return `${isNegative ? '-' : ''}${value} ${sizes[i]}`;
}

export function parseRsdoctorData(filePath: string): BundleAnalysis | null {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Rsdoctor data file not found: ${filePath}`);
      console.log(`📁 Current working directory: ${process.cwd()}`);
      console.log(`📂 Available files in current directory:`);
      try {
        const files = fs.readdirSync(process.cwd());
        files.forEach((file) => console.log(`  - ${file}`));
      } catch (e) {
        console.log(`  Error reading directory: ${e}`);
      }
      return null;
    }

    const data: RsdoctorData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const { assets, chunks } = data.data.chunkGraph;

    let totalSize = 0;
    let jsSize = 0;
    let cssSize = 0;
    let htmlSize = 0;
    let otherSize = 0;

    const assetAnalysis = assets.map((asset) => {
      totalSize += asset.size;

      let type: 'js' | 'css' | 'html' | 'other' = 'other';
      if (asset.path.endsWith('.js')) {
        type = 'js';
        jsSize += asset.size;
      } else if (asset.path.endsWith('.css')) {
        type = 'css';
        cssSize += asset.size;
      } else if (asset.path.endsWith('.html')) {
        type = 'html';
        htmlSize += asset.size;
      } else {
        otherSize += asset.size;
      }

      return {
        path: asset.path,
        size: asset.size,
        type,
      };
    });

    const chunkAnalysis = chunks.map((chunk) => ({
      name: chunk.name,
      size: chunk.size,
      isInitial: chunk.initial,
    }));

    return {
      totalSize,
      jsSize,
      cssSize,
      htmlSize,
      otherSize,
      assets: assetAnalysis,
      chunks: chunkAnalysis,
    };
  } catch (error) {
    console.error(`Failed to parse rsdoctor data from ${filePath}:`, error);
    return null;
  }
}

export function loadSizeData(filePath: string): SizeData | null {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`Size data file not found: ${filePath}`);
      return null;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!data.totalSize && data.files) {
      data.totalSize = data.files.reduce(
        (sum: number, file: any) => sum + (file.size || 0),
        0,
      );
    }

    return data;
  } catch (error) {
    console.error(`Failed to load size data from ${filePath}:`, error);
    return null;
  }
}

function calculateDiff(
  current: number,
  baseline: number,
): { value: string; emoji: string } {
  if (!baseline || baseline === 0 || isNaN(baseline)) {
    return { value: 'N/A', emoji: '❓' };
  }

  if (isNaN(current)) {
    return { value: 'N/A', emoji: '❓' };
  }

  const diff = current - baseline;
  const percent = (diff / baseline) * 100;

  if (Math.abs(percent) < 1) {
    return {
      value: `${formatBytes(diff)} (${percent.toFixed(1)}%)`,
      emoji: '➡️',
    };
  } else if (diff > 0) {
    return {
      value: `+${formatBytes(diff)} (+${percent.toFixed(1)}%)`,
      emoji: '📈',
    };
  } else {
    return {
      value: `${formatBytes(diff)} (${percent.toFixed(1)}%)`,
      emoji: '📉',
    };
  }
}

export async function generateBundleAnalysisReport(
  current: BundleAnalysis,
  baseline?: BundleAnalysis,
): Promise<void> {
  await summary.addHeading('📦 Bundle Analysis Report', 2);

  if (!baseline) {
    await summary
      .addRaw(
        '> ⚠️ **No baseline data found** - Unable to perform comparison analysis',
      )
      .addSeparator();
  } else {
    await summary.addSeparator();
  }

  const mainTable = [
    [
      { data: 'Metric', header: true },
      { data: 'Current', header: true },
      { data: 'Baseline', header: true },
      { data: 'Change', header: true },
    ],
    [
      { data: '📊 Total Size', header: false },
      { data: formatBytes(current.totalSize), header: false },
      {
        data: baseline
          ? formatBytes(baseline.totalSize)
          : formatBytes(current.totalSize),
        header: false,
      },
      {
        data: baseline
          ? calculateDiff(current.totalSize, baseline.totalSize).value
          : 'N/A',
        header: false,
      },
    ],
    [
      { data: '📄 JavaScript', header: false },
      { data: formatBytes(current.jsSize), header: false },
      {
        data: baseline
          ? formatBytes(baseline.jsSize)
          : formatBytes(current.jsSize),
        header: false,
      },
      {
        data: baseline
          ? calculateDiff(current.jsSize, baseline.jsSize).value
          : 'N/A',
        header: false,
      },
    ],
    [
      { data: '🎨 CSS', header: false },
      { data: formatBytes(current.cssSize), header: false },
      {
        data: baseline
          ? formatBytes(baseline.cssSize)
          : formatBytes(current.cssSize),
        header: false,
      },
      {
        data: baseline
          ? calculateDiff(current.cssSize, baseline.cssSize).value
          : 'N/A',
        header: false,
      },
    ],
    [
      { data: '🌐 HTML', header: false },
      { data: formatBytes(current.htmlSize), header: false },
      {
        data: baseline
          ? formatBytes(baseline.htmlSize)
          : formatBytes(current.htmlSize),
        header: false,
      },
      {
        data: baseline
          ? calculateDiff(current.htmlSize, baseline.htmlSize).value
          : 'N/A',
        header: false,
      },
    ],
    [
      { data: '📁 Other Assets', header: false },
      { data: formatBytes(current.otherSize), header: false },
      {
        data: baseline
          ? formatBytes(baseline.otherSize)
          : formatBytes(current.otherSize),
        header: false,
      },
      {
        data: baseline
          ? calculateDiff(current.otherSize, baseline.otherSize).value
          : 'N/A',
        header: false,
      },
    ],
  ];

  await summary.addTable(mainTable).addSeparator();

  await summary
    .addSeparator()
    .addRaw('<sub>Generated by Bundle Size Action</sub>');

  await summary.write();

  console.log('✅ Bundle analysis report generated successfully');
}

export async function generateSizeReport(
  current: SizeData,
  baseline?: SizeData,
): Promise<void> {
  await summary.addHeading('📦 Bundle Size Report', 2).addSeparator();

  const reportTable = [
    [
      { data: 'Metric', header: true },
      { data: 'Current', header: true },
      { data: 'Baseline', header: true },
    ],
    [
      { data: '📊 Total Size', header: false },
      { data: formatBytes(current.totalSize), header: false },
      {
        data: baseline ? formatBytes(baseline.totalSize) : 'N/A',
        header: false,
      },
    ],
    [
      { data: '📁 Files Count', header: false },
      {
        data: current.files ? current.files.length.toString() : '0',
        header: false,
      },
      {
        data: baseline?.files ? baseline.files.length.toString() : 'N/A',
        header: false,
      },
    ],
  ];

  await summary.addTable(reportTable).addSeparator();

  if (current.files && current.files.length > 0) {
    await summary.addHeading('📄 File Details', 3);

    const fileTable = [
      [
        { data: 'File', header: true },
        { data: 'Size', header: true },
      ],
    ];

    for (const file of current.files) {
      fileTable.push([
        { data: file.path, header: false },
        { data: formatBytes(file.size), header: false },
      ]);
    }

    await summary.addTable(fileTable);
  }

  await summary
    .addSeparator()
    .addRaw('<sub>Generated by Bundle Size Action</sub>');

  await summary.write();

  console.log('✅ Bundle size report card generated successfully');
}
