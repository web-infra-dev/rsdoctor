import { describe, it, expect } from '@rstest/core';
import { Server } from '@rsdoctor/utils/build';
import type { AddressInfo } from 'net';
import { RsdoctorSDK } from '../../src/sdk';
import { getDataByPagination } from '../../src/sdk/server/utils';

describe('test server/utils.ts', () => {
  it('getDataByPagination()', () => {
    expect(
      getDataByPagination([1, 2, 3], { page: 1, pageSize: 1 }),
    ).toStrictEqual({
      data: [1],
      pagination: {
        page: 1,
        pageSize: 1,
        hasNextPage: true,
      },
    });
    expect(
      getDataByPagination([1, 2, 3], { page: 1, pageSize: 2 }),
    ).toStrictEqual({
      data: [1, 2],
      pagination: {
        page: 1,
        pageSize: 2,
        hasNextPage: true,
      },
    });
    expect(
      getDataByPagination([1, 2, 3], { page: 1, pageSize: 3 }),
    ).toStrictEqual({
      data: [1, 2, 3],
      pagination: {
        page: 1,
        pageSize: 3,
        hasNextPage: false,
      },
    });
    expect(
      getDataByPagination([1, 2, 3], { page: 1, pageSize: 4 }),
    ).toStrictEqual({
      data: [1, 2, 3],
      pagination: {
        page: 1,
        pageSize: 4,
        hasNextPage: false,
      },
    });

    expect(
      getDataByPagination([1, 2, 3], { page: 2, pageSize: 1 }),
    ).toStrictEqual({
      data: [2],
      pagination: {
        page: 2,
        pageSize: 1,
        hasNextPage: true,
      },
    });
    expect(
      getDataByPagination([1, 2, 3], { page: 2, pageSize: 2 }),
    ).toStrictEqual({
      data: [3],
      pagination: {
        page: 2,
        pageSize: 2,
        hasNextPage: false,
      },
    });
    expect(
      getDataByPagination([1, 2, 3], { page: 2, pageSize: 3 }),
    ).toStrictEqual({
      data: [],
      pagination: {
        page: 2,
        pageSize: 3,
        hasNextPage: false,
      },
    });

    expect(
      getDataByPagination([1, 2, 3], { page: 3, pageSize: 1 }),
    ).toStrictEqual({
      data: [3],
      pagination: {
        page: 3,
        pageSize: 1,
        hasNextPage: false,
      },
    });
    expect(
      getDataByPagination([1, 2, 3], { page: 3, pageSize: 2 }),
    ).toStrictEqual({
      data: [],
      pagination: {
        page: 3,
        pageSize: 2,
        hasNextPage: false,
      },
    });
    expect(
      getDataByPagination([1, 2, 3], { page: 3, pageSize: 3 }),
    ).toStrictEqual({
      data: [],
      pagination: {
        page: 3,
        pageSize: 3,
        hasNextPage: false,
      },
    });

    expect(
      getDataByPagination([1, 2, 3], { page: 4, pageSize: 1 }),
    ).toStrictEqual({
      data: [],
      pagination: {
        page: 4,
        pageSize: 1,
        hasNextPage: false,
      },
    });
    expect(
      getDataByPagination([1, 2, 3], { page: 4, pageSize: 2 }),
    ).toStrictEqual({
      data: [],
      pagination: {
        page: 4,
        pageSize: 2,
        hasNextPage: false,
      },
    });
    expect(
      getDataByPagination([1, 2, 3], { page: 4, pageSize: 3 }),
    ).toStrictEqual({
      data: [],
      pagination: {
        page: 4,
        pageSize: 3,
        hasNextPage: false,
      },
    });

    expect(
      getDataByPagination([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {
        page: 1,
        pageSize: 2,
      }),
    ).toStrictEqual({
      data: [1, 2],
      pagination: {
        page: 1,
        pageSize: 2,
        hasNextPage: true,
      },
    });
    expect(
      getDataByPagination([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {
        page: 2,
        pageSize: 2,
      }),
    ).toStrictEqual({
      data: [3, 4],
      pagination: {
        page: 2,
        pageSize: 2,
        hasNextPage: true,
      },
    });
    expect(
      getDataByPagination([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {
        page: 3,
        pageSize: 2,
      }),
    ).toStrictEqual({
      data: [5, 6],
      pagination: {
        page: 3,
        pageSize: 2,
        hasNextPage: true,
      },
    });
    expect(
      getDataByPagination([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {
        page: 4,
        pageSize: 2,
      }),
    ).toStrictEqual({
      data: [7, 8],
      pagination: {
        page: 4,
        pageSize: 2,
        hasNextPage: true,
      },
    });
    expect(
      getDataByPagination([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {
        page: 5,
        pageSize: 2,
      }),
    ).toStrictEqual({
      data: [9, 10],
      pagination: {
        page: 5,
        pageSize: 2,
        hasNextPage: false,
      },
    });
    expect(
      getDataByPagination([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {
        page: 6,
        pageSize: 2,
      }),
    ).toStrictEqual({
      data: [],
      pagination: {
        page: 6,
        pageSize: 2,
        hasNextPage: false,
      },
    });

    expect(
      getDataByPagination([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {
        page: 1,
        pageSize: 3,
      }),
    ).toStrictEqual({
      data: [1, 2, 3],
      pagination: {
        page: 1,
        pageSize: 3,
        hasNextPage: true,
      },
    });
    expect(
      getDataByPagination([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {
        page: 2,
        pageSize: 3,
      }),
    ).toStrictEqual({
      data: [4, 5, 6],
      pagination: {
        page: 2,
        pageSize: 3,
        hasNextPage: true,
      },
    });
    expect(
      getDataByPagination([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {
        page: 3,
        pageSize: 3,
      }),
    ).toStrictEqual({
      data: [7, 8, 9],
      pagination: {
        page: 3,
        pageSize: 3,
        hasNextPage: true,
      },
    });
    expect(
      getDataByPagination([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {
        page: 4,
        pageSize: 3,
      }),
    ).toStrictEqual({
      data: [10],
      pagination: {
        page: 4,
        pageSize: 3,
        hasNextPage: false,
      },
    });

    expect(
      getDataByPagination([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {
        page: 1,
        pageSize: 4,
      }),
    ).toStrictEqual({
      data: [1, 2, 3, 4],
      pagination: {
        page: 1,
        pageSize: 4,
        hasNextPage: true,
      },
    });
    expect(
      getDataByPagination([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {
        page: 2,
        pageSize: 4,
      }),
    ).toStrictEqual({
      data: [5, 6, 7, 8],
      pagination: {
        page: 2,
        pageSize: 4,
        hasNextPage: true,
      },
    });
    expect(
      getDataByPagination([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {
        page: 3,
        pageSize: 4,
      }),
    ).toStrictEqual({
      data: [9, 10],
      pagination: {
        page: 3,
        pageSize: 4,
        hasNextPage: false,
      },
    });
    expect(
      getDataByPagination([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {
        page: 4,
        pageSize: 4,
      }),
    ).toStrictEqual({
      data: [],
      pagination: {
        page: 4,
        pageSize: 4,
        hasNextPage: false,
      },
    });
  });
});

describe('test server bootstrap', () => {
  it('retries with another port when the preferred port is occupied', async () => {
    const occupied = await Server.createServer(0);
    const { port } = occupied.server.address() as AddressInfo;
    const sdk = new RsdoctorSDK({
      name: 'test',
      root: process.cwd(),
      port,
    });

    try {
      await sdk.bootstrap();
      expect(sdk.server.port).not.toEqual(port);
    } finally {
      await sdk.dispose();
      await occupied.close();
    }
  });

  it('retries when concurrent servers race for the same port', async () => {
    const port = await Server.getPort(
      10000 + Math.floor(Math.random() * 10000),
    );
    const first = new RsdoctorSDK({
      name: 'test-first',
      root: process.cwd(),
      port,
    });
    const second = new RsdoctorSDK({
      name: 'test-second',
      root: process.cwd(),
      port,
    });

    try {
      await Promise.all([first.bootstrap(), second.bootstrap()]);
      expect(first.server.port).not.toEqual(second.server.port);
    } finally {
      await Promise.all([first.dispose(), second.dispose()]);
    }
  });
});
