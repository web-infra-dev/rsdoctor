import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, rs } from 'rstack/test';
import { SDK } from '@rsdoctor/shared/types';
import type { ServerAPIProvider } from 'src/components/Manifest';
import { ProjectOverall } from 'src/components/Overall/project';
import { BundleOverall } from 'src/components/Overall/bundle';

const requests = rs.hoisted(
  () => [] as Parameters<typeof ServerAPIProvider>[0][],
);

rs.mock('src/components/Manifest', () => ({
  ServerAPIProvider(props: Parameters<typeof ServerAPIProvider>[0]) {
    requests.push(props);
    return null;
  },
}));
rs.mock('src/components/TextDrawer', () => ({ TextDrawer: () => null }));
rs.mock('src/utils', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
rs.mock('src/components/Configuration', () => ({
  BuildConfigurationViewer: () => null,
}));

it.each([
  [
    'ProjectOverall',
    createElement(ProjectOverall, {
      configs: [],
      cwd: '',
      alerts: [],
      envinfo: {
        os: '',
        cpu: '',
        memory: '',
        nodeVersion: '',
        yarnVersion: '',
        npmVersion: '',
        pnpmVersion: '',
      },
    }),
  ],
  ['BundleOverall', createElement(BundleOverall, { errors: [], cwd: '' })],
] as const)('%s passes a stable body to GetAssetsSummary', (_name, card) => {
  requests.length = 0;
  const tree = createElement(MemoryRouter, {}, card);
  renderToStaticMarkup(tree);
  renderToStaticMarkup(tree);

  const [first, second] = requests;
  expect(first.api).toBe(SDK.ServerAPI.API.GetAssetsSummary);
  expect(first.body).toEqual({ withFileContent: false });
  expect(second.body).toBe(first.body);
});
