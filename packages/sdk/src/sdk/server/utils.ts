import { SDK } from '@rsdoctor/types';
import os from 'os';

export function getDataByPagination<T>(
  data: T[],
  pagination: SDK.ServerAPI.PaginationRequest,
): {
  data: T[];
  pagination: SDK.ServerAPI.PaginationResponse;
} {
  const { page = 1, pageSize = 1000 } = pagination;

  return {
    data: data.slice((page - 1) * pageSize, page * pageSize),
    pagination: {
      page,
      pageSize,
      hasNextPage: page <= 0 ? false : page * pageSize < data.length,
    },
  };
}

export function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const alias of iface as os.NetworkInterfaceInfo[]) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return '127.0.0.1'; // fallback to localhost if no external IP found
}
