import { Common, Constants, Manifest, SDK } from '@rsdoctor/types';
import { File, Json, EnvInfo } from '@rsdoctor/utils/build';
import fs from 'fs';
import path from 'path';
import { createHash, randomUUID } from 'crypto';
import process from 'process';
import { AsyncSeriesHook } from 'tapable';
import { decycle } from '@rsdoctor/utils/common';
import { logger } from '@rsdoctor/utils/logger';
import { transformDataUrls } from '../utils';
import { RsdoctorSDKOptions, DataWithUrl } from './types';
import { Algorithm } from '@rsdoctor/utils/common';

export abstract class SDKCore<T extends RsdoctorSDKOptions>
  implements SDK.RsdoctorSDKInstance
{
  protected _name: string;

  protected hash!: string;

  public extraConfig: SDK.SDKOptionsType | undefined;

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
    this._outputDir = path.join(
      this.outputDir || this.root,
      Constants.RsdoctorOutputFolder,
    );
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

    const urlsPromiseList: (Promise<DataWithUrl> | DataWithUrl)[] = [];

    for (let key of Object.keys(storeData)) {
      const data = storeData[key];
      // not use filesharding when the data is not object.
      if (typeof data !== 'object') {
        urlsPromiseList.push({
          name: key,
          files: data,
        });
        continue;
      }
      const jsonStr: string | string[] = await (async () => {
        try {
          if (key === 'configs') {
            return JSON.stringify(decycle(data));
          }
          return JSON.stringify(data);
        } catch (error) {
          // use the stream json stringify when call JSON.stringify failed due to the json is too large.
          return Json.stringify(data);
        }
      })();

      if (Array.isArray(jsonStr)) {
        const urls = jsonStr.map((str, index) => {
          return this.writeToFolder(str, outputDir, key, index + 1);
        });
        urlsPromiseList.push(...urls);
      } else {
        urlsPromiseList.push(this.writeToFolder(jsonStr, outputDir, key));
      }
    }

    /** write sharding files and get disk result */
    const dataUrls: DataWithUrl[] = await Promise.all(urlsPromiseList);

    logger.debug(
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
    logger.debug(
      `SDKCore.writeManifest extraConfig: ${this.extraConfig}`,
      '[SDKCore.writeManifest]',
    );

    // Atomic write via temp file + rename to avoid O_TRUNC truncation
    const dir = path.dirname(diskManifestPath);
    const base = path.basename(diskManifestPath);
    const tmpPath = path.join(dir, `${base}.${Date.now()}.${randomUUID()}.tmp`);

    await File.fse.outputFile(tmpPath, dataStr);
    fs.renameSync(tmpPath, diskManifestPath);

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
    jsonStr: string,
    dir: string,
    key: string,
    index?: number,
  ): Promise<DataWithUrl> {
    const sharding = new File.FileSharding(Algorithm.compressText(jsonStr));
    const folder = path.resolve(dir, key);
    const writer = sharding.writeStringToFolder(folder, '', index);
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
