import { SDK } from '@rsdoctor/types';

export enum AttributeKey {
  Module = 'data-module',
  Range = 'data-range',
}

export interface OpenTagData {
  module: number;
  range: SDK.SourceRange;
}

export function getOpenTagText(
  module: number,
  range: SDK.SourceRange,
  text: string,
) {
  return `<a data-href="${AttributeKey.Module}=${module}&${
    AttributeKey.Range
  }=${encodeURIComponent(JSON.stringify(range))}">${text}</a>`;
}

export function parseOpenTag(dom: HTMLElement): OpenTagData | undefined {
  if (dom.tagName.toLocaleLowerCase() !== 'a') {
    return;
  }

  const hrefString = dom.getAttribute('data-href') ?? '';
  const result: OpenTagData = {
    module: -1,
    range: {
      start: {
        line: 1,
        column: 0,
      },
      end: {
        line: 1,
        column: 0,
      },
    },
  };

  for (const item of hrefString.split('&')) {
    const [key, value] = item.split('=');

    if (key === AttributeKey.Module) {
      result.module = Number.parseInt(value, 10);
      continue;
    }

    if (key === AttributeKey.Range) {
      result.range = JSON.parse(decodeURIComponent(value));
    }
  }

  return result;
}
