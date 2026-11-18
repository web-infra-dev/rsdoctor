import { describe, it, expect } from 'rstack/test';
import { Loader } from '../../src/common-browser';
import { SDK } from '../../src/types';

describe('test src/common/loader.ts', () => {
  const mockLoaderData: SDK.LoaderData = [
    {
      resource: {
        path: '/test/file.js',
        queryRaw: '',
        query: {},
        ext: 'js',
      },
      loaders: [
        {
          loader: 'babel-loader',
          loaderIndex: 0,
          path: '/node_modules/babel-loader/lib/index.js',
          input: null,
          result: 'pitch result',
          startAt: 900,
          endAt: 950,
          options: {},
          isPitch: true,
          sync: false,
          errors: [],
          pid: 1,
          ppid: 0,
        },
        {
          loader: 'babel-loader',
          loaderIndex: 0,
          path: '/node_modules/babel-loader/lib/index.js',
          input: 'const foo = 1;',
          result: 'var foo = 1;',
          startAt: 1000,
          endAt: 1100,
          options: {},
          isPitch: false,
          sync: true,
          errors: [],
          pid: 1,
          ppid: 0,
        },
        {
          loader: 'ts-loader',
          loaderIndex: 1,
          path: '/node_modules/ts-loader/index.js',
          input: 'const bar: number = 2;',
          result: 'const bar = 2;',
          startAt: 900,
          endAt: 950,
          options: {},
          isPitch: false,
          sync: true,
          errors: [],
          pid: 1,
          ppid: 0,
        },
      ],
    },
  ];

  it('getLoaderFileDetails should strip input and result fields', () => {
    const result = Loader.getLoaderFileDetails('/test/file.js', mockLoaderData);

    expect(result).toBeDefined();
    expect(result.resource.path).toBe('/test/file.js');
    expect(result.loaders).toHaveLength(3);

    // Verify that input and result are NOT included
    result.loaders.forEach((loader) => {
      expect(loader).not.toHaveProperty('input');
      expect(loader).not.toHaveProperty('result');
      // But other properties should be present
      expect(loader.loader).toBeDefined();
      expect(loader.loaderIndex).toBeDefined();
      expect(loader.costs).toBeDefined();
    });
  });

  it('getLoaderFileInputAndOutput should return input and output for first loader', () => {
    const result = Loader.getLoaderFileInputAndOutput(
      '/test/file.js',
      'babel-loader',
      0,
      mockLoaderData,
      false,
    );

    expect(result).toBeDefined();
    expect(result.input).toBe('const foo = 1;');
    expect(result.output).toBe('var foo = 1;');
  });

  it('getLoaderFileInputAndOutput should return input and output for second loader (loaderIndex: 1)', () => {
    const result = Loader.getLoaderFileInputAndOutput(
      '/test/file.js',
      'ts-loader',
      1,
      mockLoaderData,
      false,
    );

    expect(result).toBeDefined();
    expect(result.input).toBe('const bar: number = 2;');
    expect(result.output).toBe('const bar = 2;');
  });

  it('getLoaderFileInputAndOutput should return empty strings for non-existent loader', () => {
    const result = Loader.getLoaderFileInputAndOutput(
      '/test/file.js',
      'non-existent-loader',
      0,
      mockLoaderData,
      false,
    );

    expect(result.input).toBe('');
    expect(result.output).toBe('');
  });

  it('getLoaderFileInputAndOutput should return empty strings for non-existent file', () => {
    const result = Loader.getLoaderFileInputAndOutput(
      '/non-existent/file.js',
      'babel-loader',
      0,
      mockLoaderData,
      false,
    );

    expect(result.input).toBe('');
    expect(result.output).toBe('');
  });

  it('getLoaderFileInputAndOutput should distinguish pitch and normal loader executions', () => {
    const pitchResult = Loader.getLoaderFileInputAndOutput(
      '/test/file.js',
      'babel-loader',
      0,
      mockLoaderData,
      true,
    );
    const normalResult = Loader.getLoaderFileInputAndOutput(
      '/test/file.js',
      'babel-loader',
      0,
      mockLoaderData,
      false,
    );

    expect(pitchResult.input).toBe('');
    expect(pitchResult.output).toBe('pitch result');
    expect(normalResult.input).toBe('const foo = 1;');
    expect(normalResult.output).toBe('var foo = 1;');
  });

  it('getLoaderFileInputAndOutput should preserve legacy lookup behavior when isPitch is omitted', () => {
    const result = Loader.getLoaderFileInputAndOutput(
      '/test/file.js',
      'babel-loader',
      0,
      mockLoaderData,
    );

    expect(result.input).toBe('');
    expect(result.output).toBe('pitch result');
  });

  it('getLoaderFileDetails should throw error for non-existent file', () => {
    expect(() => {
      Loader.getLoaderFileDetails('/non-existent/file.js', mockLoaderData);
    }).toThrow('"/non-existent/file.js" not match any loader data');
  });
  describe('getLoaderCosts', () => {
    const createLoader = (
      loader: string,
      startAt: number,
      endAt: number,
      pid = 1,
    ): SDK.LoaderTransformData => ({
      loader,
      loaderIndex: 0,
      path: `/node_modules/${loader}/index.js`,
      input: null,
      result: null,
      startAt,
      endAt,
      options: {},
      isPitch: false,
      sync: true,
      errors: [],
      pid,
      ppid: 0,
    });

    it('subtracts loaders that run inside the target loader', () => {
      const outer = createLoader('babel-loader', 0, 100);
      const loaders = [
        outer,
        createLoader('css-loader', 10, 30),
        createLoader('sass-loader', 20, 40),
        // Overlaps the end, so it doesn't block the target loader.
        createLoader('less-loader', 90, 120),
        // Builtin loaders and other processes are ignored.
        createLoader('builtin:swc-loader', 50, 60),
        createLoader('style-loader', 60, 70, 2),
      ];

      expect(Loader.getLoaderCosts(outer, loaders)).toBe(70);
      expect(Loader.createLoaderCostsCalculator(loaders)(outer)).toBe(70);
    });

    it('calculator matches getLoaderCosts for overlapping and reversed loaders across processes', () => {
      let seed = 1;
      const random = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      const names = ['babel-loader', 'css-loader', 'builtin:swc-loader'];
      const loaders = Array.from({ length: 500 }, (_, i) => {
        const startAt = Math.floor(random() * 1000);
        // Some timings end before they start, which the scan still counts.
        return createLoader(
          names[i % names.length],
          startAt,
          startAt + Math.floor(random() * 250) - 50,
          1 + (i % 3),
        );
      });

      const getCosts = Loader.createLoaderCostsCalculator(loaders);
      for (const loader of loaders) {
        expect(getCosts(loader)).toBe(Loader.getLoaderCosts(loader, loaders));
      }
    });

    it('calculator matches getLoaderCosts for repeated, reversed and NaN-pid loaders', () => {
      const target = createLoader('babel-loader', 0, 100);
      const reversed = createLoader('css-loader', 10, 0);
      const inner = createLoader('sass-loader', 10, 20);
      // The same object can appear twice; merge order follows the list.
      const repeated = [target, reversed, inner, reversed];
      expect(Loader.createLoaderCostsCalculator(repeated)(target)).toBe(
        Loader.getLoaderCosts(target, repeated),
      );

      // `===` never matches NaN, so loaders with a NaN pid never block.
      const nanTarget = createLoader('babel-loader', 0, 10, Number.NaN);
      const nanInner = createLoader('css-loader', 2, 5, Number.NaN);
      const nanPids = [nanTarget, nanInner];
      expect(Loader.createLoaderCostsCalculator(nanPids)(nanTarget)).toBe(10);
      expect(Loader.getLoaderCosts(nanTarget, nanPids)).toBe(10);
    });

    it('calculator ignores changes to the list after it is created', () => {
      const outer = createLoader('babel-loader', 0, 100);
      const loaders = [outer, createLoader('css-loader', 10, 30)];
      const getCosts = Loader.createLoaderCostsCalculator(loaders);

      loaders[1] = createLoader('css-loader', 10, 50);
      expect(getCosts(outer)).toBe(80);
    });

    it('calculator reads the list once instead of once per loader', () => {
      const loaders = Array.from({ length: 2000 }, (_, i) =>
        createLoader('babel-loader', i, i + 10),
      );
      let reads = 0;
      const counted = new Proxy(loaders, {
        get(target, key, receiver) {
          if (typeof key === 'string' && /^\d+$/.test(key)) {
            reads++;
          }
          return Reflect.get(target, key, receiver);
        },
      });

      const getCosts = Loader.createLoaderCostsCalculator(counted);
      for (const loader of loaders) {
        getCosts(loader);
      }

      // Scanning the list for every loader would read it 2000 * 2000 times.
      expect(reads).toBe(loaders.length);
    });

    it('getLoaderCosts reflects changes to the list between calls', () => {
      const outer = createLoader('babel-loader', 0, 100);
      const loaders = [outer, createLoader('css-loader', 10, 30)];
      expect(Loader.getLoaderCosts(outer, loaders)).toBe(80);

      loaders[1] = createLoader('css-loader', 10, 50);
      expect(Loader.getLoaderCosts(outer, loaders)).toBe(60);
      expect(Loader.createLoaderCostsCalculator(loaders)(outer)).toBe(60);
    });
  });
});
