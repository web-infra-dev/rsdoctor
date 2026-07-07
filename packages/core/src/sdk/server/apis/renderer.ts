import { SDK } from '@rsdoctor/shared/types';
import fs from 'node:fs';
import { BaseAPI } from './base';
import { Router } from '../router';
import { resolveClientHtmlPath } from '../client';

export class RendererAPI extends BaseAPI {
  /** sdk manifest api */
  @Router.get(SDK.ServerAPI.API.EntryHtml)
  public async entryHtml(): Promise<
    SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.EntryHtml>
  > {
    const { server, res } = this.ctx;

    // dynamic serve client:
    // require.resolve will failed due to the dist will remove when execute "npm run build" of client.
    const clientHtmlPath = resolveClientHtmlPath(server.innerClientPath);

    const clientHtml = fs.readFileSync(clientHtmlPath, 'utf-8');

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store');

    return clientHtml;
  }
}
