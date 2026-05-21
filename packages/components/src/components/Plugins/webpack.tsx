import React, { useMemo } from 'react';
import { Table, Tooltip } from 'antd';
import { sumBy, uniq } from 'es-toolkit/compat';
import { SDK } from '@rsdoctor/types';
import { formatCosts } from '../../utils';

interface WebpackPluginsTableDataItem {
  tapName: string;
  hook: string;
  key: string;
  hookData: SDK.PluginHookData[];
}
export interface WebpackPluginsDataTableProps {
  dataSource: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetPluginData>;
}

export function useWebpackPluginsDataSource(
  plugin: SDK.PluginData,
  selectedTapNames: string[],
  selectedHooks: string[],
) {
  const tapNames = useMemo(
    () =>
      uniq(
        Object.values(plugin)
          .flat()
          .map((e) => e.tapName),
      ),
    [plugin],
  );

  const hooks = useMemo(() => Object.keys(plugin), [plugin]);

  const dataSource = useMemo(() => {
    if (!tapNames.length) return [];

    return tapNames.reduce((total, tapName) => {
      if (selectedTapNames.length && !selectedTapNames.includes(tapName)) {
        return total;
      }

      hooks.forEach((hook) => {
        if (selectedHooks.length && !selectedHooks.includes(hook)) {
          return;
        }

        const hookData = plugin[hook].filter((e) => e.tapName === tapName);
        if (hookData.length === 0) return;
        total.push({
          tapName,
          hook,
          key: `${tapName}${hook}`,
          hookData,
        });
      });

      return total;
    }, [] as WebpackPluginsTableDataItem[]);
  }, [plugin, selectedTapNames, selectedHooks]);

  return {
    dataSource,
    tapNames,
    hooks,
  };
}

export const WebpackPluginsDataTable: React.FC<
  WebpackPluginsDataTableProps
> = ({ dataSource }) => {
  return (
    <Table
      dataSource={dataSource}
      rowKey={(v) => `${v.tapName}_${v.hook}`}
      columns={[
        {
          title: `Plugin Tap Name`,
          render: (_v, r) => r.tapName,
        },
        {
          title: `Hook`,
          render: (_v, r) => r.hook,
        },
        {
          title: 'calls',
          render: (_v, r) => (
            <Tooltip
              title={`"${r.hook}" has been called ${r.data.length} times by "${r.tapName}"`}
            >
              {r.data.length}
            </Tooltip>
          ),
          sorter(a, b) {
            return a.data.length - b.data.length;
          },
        },
        {
          title: 'duration(total)',
          render: (_v, r) => formatCosts(sumBy(r.data, (e) => e.costs)),
          sorter(a, b) {
            return (
              sumBy(a.data, (e) => e.costs) - sumBy(b.data, (e) => e.costs)
            );
          },
          defaultSortOrder: 'descend',
        },
      ]}
    />
  );
};
