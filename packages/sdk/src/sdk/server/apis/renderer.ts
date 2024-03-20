import { SDK } from '@rsdoctor/types';
import serve from 'serve-static';
import path from 'path';
import { File } from '@rsdoctor/utils/build';
import { BaseAPI } from './base';
import { Router } from '../router';
import { Algorithm } from '@rsdoctor/utils/common';

export class RendererAPI extends BaseAPI {
  private isClientServed = false;

  /** sdk manifest api */
  @Router.get(SDK.ServerAPI.API.EntryHtml)
  public async entryHtml(): Promise<
    SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.EntryHtml>
  > {
    const { server, res, req } = this.ctx;
    const name = req.url && req.url.match(/innerClientName=([\w-|\=]+)/)?.[1];

    // dynamic serve client:
    // require.resolve will failed due to the dist will remove when execute "npm run build" of client.
    const clientHtmlPath = name
      ? require.resolve(`${Algorithm.decompressText(name)}/react-client`)
      : require.resolve('@rsdoctor/client');
    if (!this.isClientServed) {
      this.isClientServed = true;
      const clientDistPath = path.resolve(clientHtmlPath, '..');
      server.app.use(serve(clientDistPath));
    }
    const clientHtml = await File.fse.readFile(clientHtmlPath, 'utf-8');

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store');

    return clientHtml;
  }
}
