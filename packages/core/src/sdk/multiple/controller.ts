import { Constants, Manifest } from '@rsdoctor/shared/types';
import path from 'node:path';
import { RsdoctorPrimarySDK } from './primary';

export class RsdoctorSDKController {
  readonly slaves: RsdoctorPrimarySDK[] = [];

  private readonly activeSlaves = new Set<RsdoctorPrimarySDK>();

  private outputDir = '';

  private outputOwner?: RsdoctorPrimarySDK;

  private refreshManifestTask = Promise.resolve();

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
    if (slave.isChild) {
      return path.join(
        rootOutputDir,
        '.slaves',
        slave.name.replace(/\s+/g, '-'),
      );
    }

    const name =
      slave.name.replace(/[^a-zA-Z0-9_$-]+/g, '-').replace(/^-+|-+$/g, '') ||
      `compiler-${slave.id}`;
    return path.join(rootOutputDir, 'compilers', name);
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
