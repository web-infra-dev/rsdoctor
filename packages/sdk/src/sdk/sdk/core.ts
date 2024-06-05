import { Common, Constants, Manifest, SDK } from '@rsdoctor/types';
import { File, Json, EnvInfo } from '@rsdoctor/utils/build';
import { Algorithm } from '@rsdoctor/utils/common';
import path from 'path';
import { createHash } from 'crypto';
import process from 'process';
import { AsyncSeriesHook } from 'tapable';
import { debug } from '@rsdoctor/utils/logger';
import { transformDataUrls } from '../utils';
import { RsdoctorSDKOptions, DataWithUrl } from './types';

export abstract class SDKCore<T extends RsdoctorSDKOptions>
  implements SDK.RsdoctorSDKInstance
{
  protected _name: string;

  protected hash!: string;

  extraConfig: SDK.SDKOptionsType | undefined;

  public readonly root: string;

  public readonly pid: number;

  public readonly hooks: SDK.Hooks = {
    afterSaveManifest: new AsyncSeriesHook(['result']),
  };

  protected _envinfo: SDK.EnvInfo = {} as SDK.EnvInfo;

  private _clientRoutes: Set<Manifest.RsdoctorManifestClientRoutes> = new Set([
    Manifest.RsdoctorManifestClientRoutes.Overall,
  ]);

  private _outputDir: string;

  public diskManifestPath = '';

  public cloudData?: Manifest.RsdoctorManifestWithShardingFiles;

  constructor({ name, root }: T) {
    this._name = name;
    this.root = root;
    this.pid = process.pid;
    this._outputDir = path.join(this.root, Constants.RsdoctorOutputFolder);
  }

  get outputDir() {
    return this._outputDir;
  }

  get name() {
    return this._name;
  }

  async bootstrap() {
    const [cpu, memory, nodeVersion, yarnVersion, npmVersion, pnpmVersion] =
      await Promise.all([
        EnvInfo.getCPUInfo(),
        EnvInfo.getMemoryInfo(),
        EnvInfo.getNodeVersion(),
        EnvInfo.getYarnVersion(),
        EnvInfo.getNpmVersion(),
        EnvInfo.getPnpmVersion(),
      ]);

    this._envinfo = {
      ...this._envinfo,
      cpu,
      memory,
      nodeVersion,
      yarnVersion,
      npmVersion,
      pnpmVersion,
    };

    const hash = createHash('md5')
      .update(
        [this.name, this.root, JSON.stringify(this._envinfo), Date.now()].join(
          '_',
        ),
      )
      .digest('hex');

    this.setHash(hash);
  }

  async dispose() {}

  public setOutputDir(outputDir: string) {
    this._outputDir = outputDir;
  }

  public setName(name: string) {
    this._name = name;
  }

  public setHash(hash: string) {
    this.hash = hash;
  }

  public getHash() {
    return this.hash;
  }

  public getClientRoutes() {
    return [...this._clientRoutes];
  }

  public addClientRoutes(routes: Manifest.RsdoctorManifestClientRoutes[]) {
    routes.forEach((route) => {
      this._clientRoutes.add(route);
    });
    this.onDataReport();
  }

  /** Upload analysis data pieces */
  protected async writePieces(
    storeData: Common.PlainObject,
    _options?: SDK.WriteStoreOptionsType,
  ) {
    const { outputDir } = this;
    const manifest = path.resolve(outputDir, Constants.RsdoctorOutputManifest);

    this.diskManifestPath = manifest;
    await File.fse.ensureDir(outputDir);

    /** write sharding files and get disk result */
    const dataUrls: DataWithUrl[] = await Promise.all(
      Object.keys(storeData).map(async (key) => {
        const data = storeData[key];
        // not use filesharding when the data is not object.
        if (typeof data !== 'object') {
          return {
            name: key,
            files: data,
          };
        }
        const jsonstr: string = await (async () => {
          try {
            return JSON.stringify(data);
          } catch (error) {
            // use the stream json stringify when call JSON.stringify failed due to the json is too large.
            return Json.stringify(data);
          }
        })();
        return this.writeToFolder(jsonstr, outputDir, key);
      }),
    );

    debug(
      () =>
        `SDKCore.writePieces extraConfig: ${JSON.stringify(this.extraConfig)}`,
      '[SDKCore.writePieces]',
    );
    this.cloudData = {
      client: {
        enableRoutes: this.getClientRoutes(),
      },
      data: transformDataUrls(dataUrls),
    };
  }

  /** Upload manifest file */
  protected async writeManifest(): Promise<string> {
    const { cloudData: data, diskManifestPath } = this;
    const dataStr = JSON.stringify(data, null, 2);
    debug(
      () => `SDKCore.writeManifest extraConfig: ${this.extraConfig}`,
      '[SDKCore.writeManifest]',
    );

    await Promise.all([File.fse.writeFile(diskManifestPath, dataStr)]);

    return diskManifestPath;
  }

  public async saveManifest(
    data: Common.PlainObject,
    options: SDK.WriteStoreOptionsType,
  ) {
    await this.writePieces(data, options);
    const manifestDiskPath = await this.writeManifest();

    await this.hooks.afterSaveManifest.promise({
      manifestWithShardingFiles: this.cloudData!,
      manifestDiskPath,
    });

    return manifestDiskPath;
  }

  protected writeToFolder(
    jsonstr: string,
    dir: string,
    key: string,
  ): Promise<DataWithUrl> {
    const sharding = new File.FileSharding(Algorithm.compressText(jsonstr));
    const folder = path.resolve(dir, key);
    const writer = sharding.writeStringToFolder(folder);
    return writer.then((item) => {
      const res: DataWithUrl = {
        name: key,
        files: item.map((el) => ({
          path: path.resolve(folder, el.filename),
          basename: el.filename,
          content: el.content,
        })),
      };
      return res;
    });
  }

  public abstract onDataReport(): void | Promise<void>;
}
