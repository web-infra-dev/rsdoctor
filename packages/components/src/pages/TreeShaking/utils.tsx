import { useMemo } from 'react';
import path from 'path-browserify';
import { escape, get } from 'lodash-es';
import type { ModuleGraph, Statement, Variable } from '@rsdoctor/graph';
import { Module } from '@rsdoctor/graph';
import { Tag, Space } from 'antd';
import { Range } from './range';
import type { editor, Range as RangeClass } from 'monaco-editor';
import { getOpenTagText } from './open-tag';
import {
  createFileStructures,
  mapFileKey,
  getSelectionRange,
} from '../../utils';
import { Keyword } from '../../components/Keyword';

export function useFileStructures(
  modules: Module[],
  moduleGraph: ModuleGraph,
  searchInput: string,
  selectedModule: Module,
  onItemClick: (file: string) => void,
  cwd: string,
) {
  const files = useMemo(
    () =>
      createFileStructures({
        files: modules.map((item) => item.path),
        cwd,
        fileTitle(file, basename) {
          const module = moduleGraph
            .getModules()
            .find(
              (item) => item.path === file && item.kind === Module.kind.Normal,
            )!;
          const mgm = moduleGraph.getModuleGraphModule(module)!;
          const infos = mgm.getExports();
          const unused = infos.filter(
            (info) => info.getSideEffects().length === 0,
          );
          return (
            <Space style={{ wordBreak: 'break-all' }}>
              <Keyword
                text={basename}
                keyword={file}
                onClick={() => onItemClick(file)}
              />
              {mgm.dynamic ? <Tag color="cyan">dynamic</Tag> : ''}
              {unused.length > 0 ? (
                <Tag color="green">{unused.length} Unused</Tag>
              ) : (
                ''
              )}
            </Space>
          );
        },
      }),
    [searchInput, selectedModule],
  );

  return files;
}

export function getTreeFilesDefaultExpandedKeys(files: any[]) {
  return mapFileKey(files, 3, (node) => {
    const resourcePath: string = get(node, '__RESOURCEPATH__')!;
    const isNodeModules = resourcePath.indexOf('/node_modules/') > -1;
    return !isNodeModules;
  });
}

export function ellipsisPath(full: string) {
  let result = '';
  let current = full;

  for (let i = 0; i < 3; i++) {
    result = result
      ? `${path.basename(current)}/${result}`
      : path.basename(current);
    current = path.dirname(current);
  }

  return `...${result}`;
}

export function getModulePositionString(statement: Statement, module: Module) {
  const maxLen = 30;
  const { path, isPreferSource } = module;
  const start = isPreferSource
    ? statement.position.source!.start
    : statement.position.transformed.start;
  const suffix = `:${start.line ?? 1}:${start.column ?? 0}`;

  return path.length <= maxLen
    ? `${path}${suffix}`
    : `...${path.substring(path.length - 30)}${suffix}`;
}

export function getHoverMessageInModule(
  module: Module,
  moduleGraph: ModuleGraph,
) {
  const mgm = moduleGraph.getModuleGraphModule(module);
  /** 当前模块导出变量 */
  const exportLocals = mgm.getOwnExports();
  /** 当前模块声明变量 */
  const variables = exportLocals
    .map((item) => item.variable)
    .filter((item): item is Variable => Boolean(item));

  if (exportLocals.length === 0 && variables.length === 0) {
    return [];
  }

  function getVariableMessage(data: Variable) {
    const exportData = data.getExportInfo();

    if (!exportData) {
      return 'Can not find SideEffect info.';
    }

    const sideEffects = exportData.getSideEffects();

    if (sideEffects.length === 0) {
      return 'Have no sideEffect.';
    }

    /*
     * monaco hover html 代码允许的元素和标签
     * @link https://github.com/microsoft/vscode/blob/6d2920473c6f13759c978dd89104c4270a83422d/src/vs/base/browser/markdownRenderer.ts#L296-L317
     */

    let content = `Used **${sideEffects.length}** times:\n\n<div data-code="tree-shaking-hover">\n<li>`;

    for (const sideEffect of sideEffects) {
      if (!sideEffect) {
        continue;
      }

      const { identifier, module } = sideEffect;

      if (!module) {
        continue;
      }

      const { id, isPreferSource } = module;
      const lineCode = identifier.getLineCode();

      content += `\n<ol>
      ${getOpenTagText(
        id,
        isPreferSource
          ? identifier.position.source!
          : identifier.position.transformed,
        getModulePositionString(identifier, module),
      )}
      ${lineCode ? `<pre>${escape(lineCode)}</pre>` : ''}
      </ol>`;
    }

    content += '\n</li></div>';

    return content;
  }

  const { isPreferSource } = module;

  const declarationHovers = variables
    .map((item) => {
      const position = isPreferSource
        ? item.identifier.position.source
        : item.identifier.position.transformed;
      const range =
        position &&
        getSelectionRange(position, Range as unknown as typeof RangeClass);

      if (!position || !range) {
        return;
      }

      return {
        range,
        options: {
          stickiness: 1,
          inlineClassName: 'tree-shaking-statement-declaration-identifier',
          isWholeLine: false,
          showIfCollapsed: true,
          hoverMessage: {
            supportHtml: true,
            supportThemeIcons: true,
            isTrusted: true,
            value: getVariableMessage(item),
          },
        },
      } as unknown as editor.IModelDecoration;
    })
    .filter((item): item is editor.IModelDecoration => Boolean(item));

  /**
   * 导出部分的信息，需要先过滤声明和导出位置重叠的部分
   * export { foo };
   * export { foo } from 'foo';
   * export * as name from 'foo';
   * export * from 'foo';
   * 最后一种需要合并位置
   */

  return declarationHovers;
}
