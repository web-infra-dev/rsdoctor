import { Constants, Manifest } from '@rsdoctor/shared/types';
import path from 'node:path';
import fs from 'node:fs';
import { RsdoctorPrimarySDK } from './primary';
import { writeJsonAtomic } from '../utils/writeJson';

function toUrlPath(filePath: string) {
  return filePath
    .split(path.sep)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export class RsdoctorSDKController {
  readonly slaves: RsdoctorPrimarySDK[] = [];

  private readonly activeSlaves = new Set<RsdoctorPrimarySDK>();

  private outputDir = '';

  private outputOwner?: RsdoctorPrimarySDK;

  private refreshManifestTask = Promise.resolve();

  private readonly compilerDirectories = new Map<
    RsdoctorPrimarySDK,
    { name: string; directory: string }
  >();

  private readonly briefReports = new Map<
    RsdoctorPrimarySDK,
    { filePath: string; metadata: string }
  >();

  public root = '';

  constructor(root = process.cwd()) {
    this.root = root;
  }

  get master() {
    return this.getActiveSlaves()[0];
  }

  get isMultiple() {
    return this.activeSlaves.size > 1;
  }

  getLastSdk() {
    return this.slaves[this.slaves.length - 1];
  }

  hasName(name: string, exclude?: RsdoctorPrimarySDK) {
    return Boolean(
      this.slaves.find((item) => item !== exclude && item.name === name),
    );
  }

  registerSlave(slave: RsdoctorPrimarySDK) {
    this.activeSlaves.add(slave);
  }

  setOutputDir(slave: RsdoctorPrimarySDK, outputDir: string) {
    if (slave === this.master && slave !== this.outputOwner) {
      this.outputDir = outputDir;
      this.outputOwner = slave;
      slave.setOutputDir(outputDir);
    }
  }

  getCompilerOutputDir(slave: RsdoctorPrimarySDK) {
    if (slave === this.master) {
      return this.outputDir || slave.outputDir;
    }

    const rootOutputDir =
      this.outputDir || this.master?.outputDir || slave.outputDir;
    const existing = this.compilerDirectories.get(slave);
    if (existing?.name === slave.name) {
      return path.join(rootOutputDir, existing.directory);
    }

    const name =
      slave.name
        .replace(
          slave.isChild ? /[^a-zA-Z0-9_$.-]+/g : /[^a-zA-Z0-9_$-]+/g,
          '-',
        )
        .replace(/^[-.]+|[-.]+$/g, '') || `compiler-${slave.id}`;
    const folder = slave.isChild ? '.slaves' : 'compilers';
    const occupied = new Set(
      [...this.compilerDirectories.values()].map(({ directory }) =>
        directory.toLowerCase(),
      ),
    );
    let directory = path.join(folder, name);
    let suffix = 2;
    while (occupied.has(directory.toLowerCase())) {
      directory = path.join(folder, `${name}-${suffix++}`);
    }
    this.compilerDirectories.set(slave, { name: slave.name, directory });
    return path.join(rootOutputDir, directory);
  }

  writeBriefJson(
    current: RsdoctorPrimarySDK,
    data: Manifest.RsdoctorBriefData,
  ) {
    const compilers = this.getActiveSlaves().flatMap((sdk) => {
      const filePath = sdk.getBriefJsonPath(this.getCompilerOutputDir(sdk));
      return filePath ? [{ sdk, filePath }] : [];
    });
    const paths = new Set<string>();
    for (const { filePath } of compilers) {
      const key = filePath.toLowerCase();
      if (paths.has(key)) {
        throw new Error(`Compiler JSON output paths overlap: ${filePath}`);
      }
      paths.add(key);
    }

    // Keep data writes and metadata refreshes synchronous so a refresh cannot
    // overwrite a newer watch build in the same process. Cache only metadata.
    for (const { sdk, filePath } of compilers) {
      const series: Manifest.RsdoctorBriefSeriesData[] = compilers.map(
        ({ sdk: item, filePath: target }) => ({
          name: item.name,
          displayName: item.displayName,
          dataFile: path
            .relative(path.dirname(filePath), target)
            .split(path.sep)
            .join('/'),
          stage: item.stage,
          compilerPath: item.compilerPath,
          parentCompilerPath: item.parentCompilerPath,
          isChild: item.isChild,
        }),
      );
      const metadata = { name: sdk.name, series };
      const signature = JSON.stringify(metadata);
      const previous = this.briefReports.get(sdk);
      if (sdk !== current) {
        if (
          !previous ||
          previous.filePath !== filePath ||
          !fs.existsSync(filePath)
        ) {
          continue;
        }
        if (previous.metadata === signature) {
          continue;
        }
      }
      const report: Manifest.RsdoctorBriefData =
        sdk === current ? data : JSON.parse(fs.readFileSync(filePath, 'utf8'));
      writeJsonAtomic(filePath, { ...report, ...metadata });
      this.briefReports.set(sdk, { filePath, metadata: signature });
    }
  }

  getSeriesData(serverUrl = false) {
    return this.getActiveSlaves().map((item) => {
      const data: Manifest.RsdoctorManifestSeriesData = {
        name: item.name,
        displayName: item.displayName,
        path: item.reportFileName
          ? path.join(this.getCompilerOutputDir(item), item.reportFileName)
          : item.diskManifestPath ||
            path.resolve(
              this.getCompilerOutputDir(item),
              Constants.RsdoctorOutputManifest,
            ),
        stage: item.stage,
        compilerPath: item.compilerPath,
        parentCompilerPath: item.parentCompilerPath,
        isChild: item.isChild,
      };

      if (serverUrl) {
        data.origin = item.server.origin;
      }

      return data;
    });
  }

  getBriefSeriesData(
    current: RsdoctorPrimarySDK,
  ): Manifest.RsdoctorManifestSeriesData[] {
    const currentOutputDir = this.getCompilerOutputDir(current);

    return this.getActiveSlaves().map((item) => ({
      name: item.name,
      path: toUrlPath(
        path.relative(
          currentOutputDir,
          path.join(
            this.getCompilerOutputDir(item),
            item.reportFileName || 'rsdoctor-report.html',
          ),
        ),
      ),
      stage: item.stage,
    }));
  }

  createSlave({
    name,
    displayName,
    compilerPath,
    parentCompilerPath,
    isChild,
    stage,
    extraConfig,
    type,
  }: Omit<ConstructorParameters<typeof RsdoctorPrimarySDK>[0], 'controller'>) {
    const slave = new RsdoctorPrimarySDK({
      name,
      displayName,
      compilerPath,
      parentCompilerPath,
      isChild,
      stage: typeof stage === 'number' ? stage : this.slaves.length,
      controller: this,
      extraConfig,
      type,
    });
    this.slaves.push(slave);
    // sort by stage after create slave sdk.
    this.slaves.sort((a, b) => a.stage - b.stage);
    return slave;
  }

  refreshManifestSeries() {
    if (!this.isMultiple) {
      return Promise.resolve();
    }

    this.refreshManifestTask = this.refreshManifestTask.then(async () => {
      for (const slave of this.getActiveSlaves()) {
        await slave.refreshManifestSeries();
      }
    });
    return this.refreshManifestTask;
  }

  private getActiveSlaves() {
    return this.slaves.filter((item) => this.activeSlaves.has(item));
  }
}
