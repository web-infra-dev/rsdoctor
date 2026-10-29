import * as echarts from 'echarts/core';

export const escapeHtml = (value: unknown) =>
  echarts.format.encodeHTML(String(value));
