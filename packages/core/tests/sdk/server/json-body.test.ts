import { describe, expect, it } from '@rstest/core';
import type { Thirdparty } from '@rsdoctor/shared/types';
import { PassThrough, Readable } from 'node:stream';
import { brotliCompressSync, deflateSync, gzipSync } from 'node:zlib';
import { jsonBodyParser } from '../../../src/sdk/server/json-body';

interface RequestWithBody extends Thirdparty.connect.IncomingMessage {
  body?: unknown;
}

function createRequest(
  body: string | Buffer,
  headers: Record<string, string> = {},
): RequestWithBody {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const req = Readable.from([buffer]) as unknown as RequestWithBody;
  req.headers = {
    'content-length': String(buffer.byteLength),
    'content-type': 'application/json',
    ...headers,
  };
  return req;
}

function parse(
  req: RequestWithBody,
  limit:
    | number
    | string
    | ((req: Thirdparty.connect.IncomingMessage) => number | string) = '500mb',
): Promise<unknown> {
  return new Promise((resolve) => {
    jsonBodyParser({ limit })(req, {} as never, resolve);
  });
}

describe('jsonBodyParser', () => {
  it('parses JSON objects and arrays', async () => {
    const objectRequest = createRequest('{"answer":42}');
    expect(await parse(objectRequest)).toBeUndefined();
    expect(objectRequest.body).toEqual({ answer: 42 });

    const arrayRequest = createRequest('[1,2,3]');
    expect(await parse(arrayRequest)).toBeUndefined();
    expect(arrayRequest.body).toEqual([1, 2, 3]);
  });

  it('skips requests that are not JSON', async () => {
    const req = createRequest('hello', { 'content-type': 'text/plain' });
    req.body = { parsed: 'earlier' };
    expect(await parse(req)).toBeUndefined();
    expect(req.body).toEqual({ parsed: 'earlier' });
  });

  it('rejects malformed and primitive JSON', async () => {
    const malformed = await parse(createRequest('{'));
    expect(malformed).toMatchObject({
      status: 400,
      type: 'entity.parse.failed',
    });

    const primitive = await parse(createRequest('42'));
    expect(primitive).toMatchObject({
      status: 400,
      type: 'entity.parse.failed',
    });
  });

  it('rejects bodies over the configured limit', async () => {
    const error = await parse(createRequest('{"value":"large"}'), 8);
    expect(error).toMatchObject({
      status: 413,
      type: 'entity.too.large',
    });
  });

  it('resolves the body limit for each route', async () => {
    const resolveLimit = (req: Thirdparty.connect.IncomingMessage) =>
      req.url === '/large' ? 32 : 8;

    const regularRequest = createRequest('{"value":"large"}');
    regularRequest.url = '/regular';
    await expect(parse(regularRequest, resolveLimit)).resolves.toMatchObject({
      status: 413,
      type: 'entity.too.large',
    });

    const largeRequest = createRequest('{"value":"large"}');
    largeRequest.url = '/large';
    expect(await parse(largeRequest, resolveLimit)).toBeUndefined();
    expect(largeRequest.body).toEqual({ value: 'large' });
  });

  it('handles errors thrown by the body limit resolver', async () => {
    const req = createRequest(gzipSync('{}'), {
      'content-encoding': 'gzip',
    });
    const error = await parse(req, () => {
      throw new Error('failed to resolve body limit');
    });

    expect(error).toMatchObject({
      message: 'failed to resolve body limit',
      status: 400,
      type: 'request.invalid',
    });
  });

  it('rejects unsupported charsets and content encodings', async () => {
    const charsetError = await parse(
      createRequest('{}', {
        'content-type': 'application/json; charset=iso-8859-1',
      }),
    );
    expect(charsetError).toMatchObject({
      status: 415,
      type: 'charset.unsupported',
    });

    const unknownCharsetError = await parse(
      createRequest('{}', {
        'content-type': 'application/json; charset=utf-nope',
      }),
    );
    expect(unknownCharsetError).toMatchObject({
      status: 415,
      type: 'charset.unsupported',
    });

    const encodingError = await parse(
      createRequest('{}', { 'content-encoding': 'compress' }),
    );
    expect(encodingError).toMatchObject({
      status: 415,
      type: 'encoding.unsupported',
    });
  });

  it('parses compressed JSON bodies', async () => {
    const source = Buffer.from('{"compressed":true}');
    const fixtures = [
      ['gzip', gzipSync(source)],
      ['deflate', deflateSync(source)],
      ['br', brotliCompressSync(source)],
    ] as const;

    for (const [encoding, body] of fixtures) {
      const req = createRequest(body, { 'content-encoding': encoding });
      expect(await parse(req)).toBeUndefined();
      expect(req.body).toEqual({ compressed: true });
    }
  });

  it('rejects a content-length mismatch', async () => {
    const error = await parse(createRequest('{}', { 'content-length': '10' }));
    expect(error).toMatchObject({
      status: 400,
      type: 'request.size.invalid',
    });
  });

  it('rejects an aborted compressed request', async () => {
    const req = new PassThrough() as unknown as RequestWithBody;
    req.headers = {
      'content-encoding': 'gzip',
      'content-type': 'application/json',
      'transfer-encoding': 'chunked',
    };

    const result = parse(req);
    req.write(gzipSync('{"partial":true}').subarray(0, 4));
    req.emit('aborted');

    await expect(result).resolves.toMatchObject({
      status: 400,
      type: 'request.aborted',
    });
  });
});
