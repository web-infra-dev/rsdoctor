import { expect, test } from '@rstest/core';
import path from 'node:path';
import fs from 'node:fs';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const readFileAsync = promisify(fs.readFile);

// Replicate the security-fixed readMarkdownResource function for testing
async function readMarkdownResource(uri: URL, baseDir: string) {
  // Extract the filename from the URI pathname
  // The URI format is file://rsdoctor/<filename>
  const requestedPath = uri.pathname;

  // Security: Validate that the pathname is a simple filename without path traversal
  // This prevents attacks like file://rsdoctor/../../etc/passwd
  const filename = path.basename(requestedPath);

  // Additional security check: ensure the filename only contains safe characters
  // and doesn't contain path traversal sequences
  if (
    !filename ||
    filename !== requestedPath.replace(/^\//, '') ||
    /\.\./.test(requestedPath)
  ) {
    throw new Error('Invalid resource path: path traversal detected');
  }

  // Construct the safe file path within the resources directory
  const resourcesDir = path.join(baseDir, './resources');
  const filePath = path.join(resourcesDir, filename);

  // Additional security: Verify the resolved path is still within the resources directory
  const resolvedPath = path.resolve(filePath);
  const resolvedResourcesDir = path.resolve(resourcesDir);
  const relativePath = path.relative(resolvedResourcesDir, resolvedPath);

  // Check if the relative path starts with '..' or is an absolute path
  // This prevents both upward traversal and accessing files outside the directory
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('Invalid resource path: access denied');
  }

  // Read the contents of the Markdown file
  const contents = await readFileAsync(filePath, 'utf-8');

  return {
    contents: [
      {
        uri: uri.href,
        mimeType: 'text/markdown',
        text: contents,
      },
    ],
  };
}

test('readMarkdownResource - legitimate file access', async () => {
  // Test that legitimate file access works correctly
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const baseDir = path.join(__dirname, '..');

  // This should work - accessing a legitimate resource file
  const uri = new URL('file://rsdoctor/rsdoctor-config.md');
  const result = await readMarkdownResource(uri, baseDir);

  expect(result.contents).toBeDefined();
  expect(result.contents[0].mimeType).toBe('text/markdown');
  expect(result.contents[0].text).toBeDefined();
  expect(result.contents[0].text.length).toBeGreaterThan(0);
});

test('readMarkdownResource - path traversal with ../ blocked', async () => {
  // Test that path traversal attacks are blocked
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const baseDir = path.join(__dirname, '..');

  // This should be blocked - path traversal attempt
  const uri = new URL('file://rsdoctor/../../../etc/passwd');

  await expect(async () => {
    await readMarkdownResource(uri, baseDir);
  }).rejects.toThrow('Invalid resource path: path traversal detected');
});

test('readMarkdownResource - path traversal with subdirectory blocked', async () => {
  // Test that accessing files in subdirectories is blocked
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const baseDir = path.join(__dirname, '..');

  // This should be blocked - attempting to access file in subdirectory
  const uri = new URL('file://rsdoctor/subdir/file.md');

  await expect(async () => {
    await readMarkdownResource(uri, baseDir);
  }).rejects.toThrow('Invalid resource path');
});

test('readMarkdownResource - path traversal with absolute path blocked', async () => {
  // Test that absolute paths are blocked
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const baseDir = path.join(__dirname, '..');

  // This should be blocked - absolute path
  const uri = new URL('file://rsdoctor//etc/passwd');

  await expect(async () => {
    await readMarkdownResource(uri, baseDir);
  }).rejects.toThrow();
});
