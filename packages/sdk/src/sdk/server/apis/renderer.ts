import { SDK } from '@rsdoctor/types';
import { File } from '@rsdoctor/utils/build';
import { BaseAPI } from './base';
import { Router } from '../router';

export class RendererAPI extends BaseAPI {
  /** sdk manifest api */
  @Router.get(SDK.ServerAPI.API.EntryHtml)
  public async entryHtml(): Promise<
    SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.EntryHtml>
  > {
    const { server, res } = this.ctx;

    // dynamic serve client:
    // require.resolve will failed due to the dist will remove when execute "npm run build" of client.
    const clientHtmlPath = server.innerClientPath
      ? server.innerClientPath
      : require.resolve('@rsdoctor/client');

    const clientHtml = await File.fse.readFile(clientHtmlPath, 'utf-8');

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store');

    return clientHtml;
  }
}
