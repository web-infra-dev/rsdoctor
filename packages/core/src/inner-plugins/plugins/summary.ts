import { Summary } from '@rsdoctor/utils/common';
import minBy from 'lodash/minBy.js';
import sumBy from 'lodash/sumBy.js';
import type { Plugin } from '@rsdoctor/types';
import { InternalBasePlugin } from './base';
import { time, timeEnd } from '@rsdoctor/utils/logger';

export class InternalSummaryPlugin<
  T extends Plugin.BaseCompiler,
> extends InternalBasePlugin<T> {
  public readonly name = 'summary';

  private times: Map<Summary.SummaryCostsDataName, number> = new Map();

  private preTimes: Map<Summary.SummaryCostsDataName, number> = new Map();

  private postTimes: Map<Summary.SummaryCostsDataName, number> = new Map();

  public apply(compiler: T) {
    time('InternalSummaryPlugin.apply');
    try {
      compiler.hooks.beforeCompile.tapPromise(
        this.tapPostOptions,
        this.beforeCompile,
      );

      compiler.hooks.afterCompile.tapPromise(
        this.tapPreOptions,
        this.afterCompile,
      );

      compiler.hooks.done.tapPromise(
        this.tapPostOptions,
        this.done.bind(this, compiler),
      );
    } finally {
      timeEnd('InternalSummaryPlugin.apply');
    }
  }

  private mark(key: Summary.SummaryCostsDataName, type: 'pre' | 'post') {
    const now = Date.now();

    switch (type) {
      case 'pre':
        this.preTimes.set(key, now);
        break;
      case 'post':
        this.postTimes.set(key, now);
        break;
      default:
        break;
    }
  }

  public beforeCompile = async (): Promise<void> => {
    time('InternalSummaryPlugin.beforeCompile');
    try {
      // report bootstrap -> compile
      if (!this.times.has(Summary.SummaryCostsDataName.Bootstrap)) {
        const costs = Math.floor(process.uptime() * 1000);
        const startAt = Date.now() - costs;
        this.report(Summary.SummaryCostsDataName.Bootstrap, startAt);
        this.mark(Summary.SummaryCostsDataName.Bootstrap, 'post');
      }
    } finally {
      timeEnd('InternalSummaryPlugin.beforeCompile');
    }
  };

  public afterCompile = async (
    compilation: Plugin.BaseCompilation,
  ): Promise<void> => {
    time('InternalSummaryPlugin.afterCompile');
    try {
      // child Compiler hook time cannot use as main compile's.
      if (
        !this.times.has(Summary.SummaryCostsDataName.Compile) &&
        !compilation.compiler.isChild()
      ) {
        // report compile -> after compile
        const start = this.postTimes.get(
          Summary.SummaryCostsDataName.Bootstrap,
        )!;
        this.report(Summary.SummaryCostsDataName.Compile, start);
        this.mark(Summary.SummaryCostsDataName.Compile, 'post');
      }
    } finally {
      timeEnd('InternalSummaryPlugin.afterCompile');
    }
  };

  public done = async (compiler: T): Promise<void> => {
    time('InternalSummaryPlugin.done');
    try {
      // report compile -> done
      const start = this.postTimes.get(Summary.SummaryCostsDataName.Compile)!;
      this.report(Summary.SummaryCostsDataName.Done, start);

      // report minify costs
      if (compiler.options.optimization.minimize !== false) {
        const pluginData = this.sdk.getStoreData().plugin;
        const minifyHookData = [...(pluginData.processAssets || [])];
        minifyHookData.length &&
          this.sdk.reportSummaryData({
            costs: [
              {
                name: Summary.SummaryCostsDataName.Minify,
                startAt: minBy(minifyHookData, (e) => e.startAt)!.startAt,
                costs: sumBy(minifyHookData, (e) => e.costs),
              },
            ],
          });
      }
    } finally {
      timeEnd('InternalSummaryPlugin.done');
    }
  };

  private report(name: Summary.SummaryCostsDataName, start: number) {
    this.times.set(name, start);
    this.sdk.reportSummaryData({
      costs: [
        {
          name,
          startAt: start,
          costs: Date.now() - start,
        },
      ],
    });
  }
}
