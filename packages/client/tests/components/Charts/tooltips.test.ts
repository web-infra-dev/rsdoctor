import { describe, expect, it, rs } from 'rstack/test';
import {
  formatterForPlugins,
  getTooltipHtmlForLoader,
  renderTotalLoadersTooltip,
} from 'src/components/Charts/utils';

rs.mock('src/utils', () => ({
  formatCosts: () => '1 ms',
}));

const payloads = {
  loader: '<img src=x data-field=loader onerror=alert(1)>',
  layer: '<img src=x data-field=layer onerror=alert(1)>',
  resource: '<img src=x data-field=resource onerror=alert(1)>',
  pluginHook: '<img src=x data-field=hook onerror=alert(1)>',
  pluginTap: '<img src=x data-field=tap onerror=alert(1)>',
};

function expectNoRawPayload(tooltip: string, values: string[]) {
  for (const value of values) {
    expect(tooltip).not.toContain(value);
    expect(tooltip).toContain(value.replaceAll('<', '&lt;').replaceAll('>', '&gt;'));
  }
}

describe('chart tooltips', () => {
  it('escapes every build-derived loader field before rendering tooltip HTML', () => {
    const tooltip = getTooltipHtmlForLoader({
      loader: payloads.loader,
      layer: payloads.layer,
      resource: payloads.resource,
      isPitch: false,
      costs: 1,
      startAt: 0,
      endAt: 1,
      pid: 1,
      sync: false,
    });

    expectNoRawPayload(tooltip, [
      payloads.loader,
      payloads.layer,
      payloads.resource,
    ]);
  });

  it('escapes build-derived loader and plugin names before rendering tooltip HTML', () => {
    const loaderTooltip = renderTotalLoadersTooltip(
      payloads.loader,
      [
        {
          loader: payloads.loader,
          layer: undefined,
          resource: '/project/file.js',
          isPitch: false,
          costs: 1,
          startAt: 0,
          endAt: 1,
          pid: 1,
          sync: false,
        },
      ],
      '/project',
    );
    const pluginTooltip = formatterForPlugins({
      data: {
        ext: {
          args: {
            p: payloads.pluginHook,
            n: payloads.pluginTap,
            s: 0,
            e: 1,
          },
          name: 'plugin',
          ph: 'B',
          pid: 1,
          ts: 0,
        },
      },
    });

    expectNoRawPayload(loaderTooltip, [payloads.loader]);
    expectNoRawPayload(pluginTooltip, [
      payloads.pluginHook,
      payloads.pluginTap,
    ]);
  });
});
