import { SDK } from '@rsdoctor/types';
import fs from 'node:fs';
import { createRequire } from 'module';
import { BaseAPI } from './base';
import { Router } from '../router';

const require = createRequire(import.meta.url);

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

    const clientHtml = fs.readFileSync(clientHtmlPath, 'utf-8');

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store');

    return clientHtml;
  }
}
