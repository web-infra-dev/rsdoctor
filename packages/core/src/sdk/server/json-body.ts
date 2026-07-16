import type { Thirdparty } from '@rsdoctor/shared/types';
import getRawBody from 'raw-body';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';

interface JsonBodyParserOptions {
  limit?:
    | number
    | string
    | ((req: Thirdparty.connect.IncomingMessage) => number | string);
}

interface HttpError extends Error {
  status: number;
  statusCode: number;
  type: string;
}

interface RequestWithBody extends Thirdparty.connect.IncomingMessage {
  body?: unknown;
}

const JSON_CONTENT_TYPE = 'application/json';
const DEFAULT_CHARSET = 'utf-8';

function createHttpError(
  status: number,
  message: string,
  type: string,
): HttpError {
  return Object.assign(new Error(message), {
    status,
    statusCode: status,
    type,
  });
}

function hasBody(req: Thirdparty.connect.IncomingMessage): boolean {
  return (
    req.headers['transfer-encoding'] !== undefined ||
    !Number.isNaN(Number(req.headers['content-length']))
  );
}

function getContentType(req: Thirdparty.connect.IncomingMessage) {
  const contentType = req.headers['content-type'];
  if (typeof contentType !== 'string') {
    return undefined;
  }

  return contentType;
}

function shouldParse(req: Thirdparty.connect.IncomingMessage): boolean {
  const contentType = getContentType(req);
  if (!contentType) {
    return false;
  }

  return (
    contentType.split(';', 1)[0].trim().toLowerCase() === JSON_CONTENT_TYPE
  );
}

function getCharset(req: Thirdparty.connect.IncomingMessage): string {
  const contentType = getContentType(req);
  const match = contentType?.match(
    /(?:^|;)\s*charset\s*=\s*(?:"([^"]+)"|([^;\s]+))/i,
  );

  return (match?.[1] || match?.[2] || DEFAULT_CHARSET).toLowerCase();
}

function getContentStream(req: Thirdparty.connect.IncomingMessage): {
  stream: NodeJS.ReadableStream;
  cleanup?: () => void;
  decompressor?: ReturnType<typeof createGunzip>;
  length?: string;
} {
  const contentEncoding = req.headers['content-encoding'];
  const encoding =
    typeof contentEncoding === 'string'
      ? contentEncoding.toLowerCase()
      : 'identity';

  if (encoding === 'identity') {
    return {
      stream: req,
      length: req.headers['content-length'],
    };
  }

  let stream;
  switch (encoding) {
    case 'gzip':
      stream = createGunzip();
      break;
    case 'deflate':
      stream = createInflate();
      break;
    case 'br':
      stream = createBrotliDecompress();
      break;
    default:
      throw createHttpError(
        415,
        `unsupported content encoding "${encoding}"`,
        'encoding.unsupported',
      );
  }

  const cleanup = () => {
    req.removeListener('aborted', onAborted);
    req.removeListener('close', onClose);
    req.removeListener('error', onError);
    stream.removeListener('close', cleanup);
  };
  const destroy = (error: Error) => {
    if (!stream.destroyed) {
      stream.destroy(error);
    }
  };
  const onAborted = () => {
    destroy(createHttpError(400, 'request aborted', 'request.aborted'));
  };
  const onClose = () => {
    if (req.complete === false) {
      onAborted();
    }
  };
  const onError = (error: Error) => {
    destroy(error);
  };

  req.once('aborted', onAborted);
  req.once('close', onClose);
  req.once('error', onError);
  stream.once('close', cleanup);
  req.pipe(stream);
  return { stream, cleanup, decompressor: stream };
}

function parseJson(body: string): unknown {
  if (body.length === 0) {
    return {};
  }

  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch (error) {
    throw createHttpError(400, (error as Error).message, 'entity.parse.failed');
  }

  if (value === null || typeof value !== 'object') {
    throw createHttpError(
      400,
      'JSON body must be an object or array',
      'entity.parse.failed',
    );
  }

  return value;
}

function normalizeReadError(error: unknown, charset?: string): Error {
  if (
    error instanceof Error &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    if (charset && 'type' in error && error.type === 'encoding.unsupported') {
      return createHttpError(
        415,
        `unsupported charset "${charset.toUpperCase()}"`,
        'charset.unsupported',
      );
    }
    return error;
  }

  return createHttpError(
    400,
    error instanceof Error ? error.message : 'failed to read request body',
    'request.invalid',
  );
}

export function jsonBodyParser(
  options: JsonBodyParserOptions = {},
): Thirdparty.connect.NextHandleFunction {
  return (req, _res, next) => {
    const request = req as RequestWithBody;
    if (!('body' in request)) {
      request.body = undefined;
    }

    if (!hasBody(req) || !shouldParse(req)) {
      next();
      return;
    }

    const charset = getCharset(req);
    if (!charset.startsWith('utf-')) {
      req.resume();
      next(
        createHttpError(
          415,
          `unsupported charset "${charset.toUpperCase()}"`,
          'charset.unsupported',
        ),
      );
      return;
    }

    let content;
    try {
      content = getContentStream(req);
    } catch (error) {
      req.resume();
      next(normalizeReadError(error));
      return;
    }

    const handleError = (error: unknown) => {
      content.cleanup?.();
      if (content.decompressor) {
        req.unpipe(content.decompressor);
        content.decompressor.destroy();
      }
      req.resume();
      next(normalizeReadError(error, charset));
    };

    let limit: number | string | undefined;
    try {
      limit =
        typeof options.limit === 'function'
          ? options.limit(req)
          : options.limit;
    } catch (error) {
      handleError(error);
      return;
    }

    getRawBody(content.stream, {
      encoding: charset,
      length: content.length,
      limit,
    }).then((body) => {
      try {
        request.body = parseJson(body);
      } catch (error) {
        handleError(error);
        return;
      }

      content.cleanup?.();
      next();
    }, handleError);
  };
}
