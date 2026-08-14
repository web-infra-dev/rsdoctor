import fs from 'node:fs';
import path from 'node:path';

const CLIENT_MANIFEST_NAME = 'rsdoctor-client-manifest.json';

interface ClientManifestEntry {
  async?: {
    css?: string[];
    js?: string[];
  };
}

interface ClientManifest {
  entries?: Record<string, ClientManifestEntry>;
}

interface HtmlAsset {
  path: string;
  tag: string;
}

const getAttribute = (tag: string, name: string): string | undefined => {
  const match = tag.match(new RegExp(`\\s${name}=["']([^"']+)["']`, 'i'));
  return match?.[1];
};

const normalizeAssetPath = (assetPath: string): string =>
  assetPath.replace(/[?#].*$/, '').replace(/^\.?\//, '');

const resolveAssetPath = (basePath: string, assetPath: string): string => {
  const resolvedPath = path.resolve(basePath, normalizeAssetPath(assetPath));
  const relativePath = path.relative(basePath, resolvedPath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(
      `Client asset is outside its distribution directory: ${assetPath}`,
    );
  }

  return resolvedPath;
};

const readAsset = (basePath: string, assetPath: string): string =>
  fs.readFileSync(resolveAssetPath(basePath, assetPath), 'utf8');

const escapeClosingTag = (content: string, tagName: string): string =>
  content.replace(new RegExp(`</${tagName}`, 'gi'), `<\\/${tagName}`);

const renderScript = (basePath: string, assetPath: string): string =>
  `<script>${escapeClosingTag(readAsset(basePath, assetPath), 'script')}</script>`;

const renderStyle = (
  basePath: string,
  assetPath: string,
  dataHref = false,
): string => {
  const attribute = dataHref ? ` data-href="${assetPath}"` : '';
  return `<style${attribute}>${escapeClosingTag(readAsset(basePath, assetPath), 'style')}</style>`;
};

const readAsyncAssets = (
  basePath: string,
  entryName: string,
): Required<NonNullable<ClientManifestEntry['async']>> => {
  const manifestPath = path.join(basePath, CLIENT_MANIFEST_NAME);
  if (!fs.existsSync(manifestPath)) {
    return { css: [], js: [] };
  }

  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, 'utf8'),
  ) as ClientManifest;
  const entry = manifest.entries?.[entryName];
  if (!entry) {
    throw new Error(
      `Client manifest does not contain the "${entryName}" entry.`,
    );
  }

  return {
    css: entry.async?.css ?? [],
    js: entry.async?.js ?? [],
  };
};

export const inlineClientAssets = (
  htmlFilePath: string,
  entryName = path.basename(htmlFilePath, path.extname(htmlFilePath)),
): string => {
  const basePath = path.dirname(htmlFilePath);
  const scripts: HtmlAsset[] = [];
  const styles: HtmlAsset[] = [];
  let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');

  htmlContent = htmlContent.replace(
    /<script\b[^>]*\bsrc=["'][^"']+["'][^>]*><\/script>/gi,
    (tag) => {
      const src = getAttribute(tag, 'src');
      if (src) scripts.push({ path: src, tag });
      return src ? '' : tag;
    },
  );
  htmlContent = htmlContent.replace(/<link\b[^>]*>/gi, (tag) => {
    const href = getAttribute(tag, 'href');
    const rel = getAttribute(tag, 'rel');
    if (href && rel?.toLowerCase() === 'stylesheet') {
      styles.push({ path: href, tag });
      return '';
    }
    return tag;
  });

  const asyncAssets = readAsyncAssets(basePath, entryName);
  const initialScriptPaths = new Set(
    scripts.map(({ path: assetPath }) => normalizeAssetPath(assetPath)),
  );
  const initialStylePaths = new Set(
    styles.map(({ path: assetPath }) => normalizeAssetPath(assetPath)),
  );
  const uniqueAsyncScripts = Array.from(new Set(asyncAssets.js)).filter(
    (assetPath) => !initialScriptPaths.has(normalizeAssetPath(assetPath)),
  );
  const uniqueAsyncStyles = Array.from(new Set(asyncAssets.css)).filter(
    (assetPath) => !initialStylePaths.has(normalizeAssetPath(assetPath)),
  );

  const inlinedStyles = [
    ...styles.map(({ path: assetPath }) => renderStyle(basePath, assetPath)),
    ...uniqueAsyncStyles.map((assetPath) =>
      renderStyle(basePath, assetPath, true),
    ),
  ].join('');
  // Rspack async chunks register themselves through the chunk loading global.
  // Place them before the runtime so standalone reports can resolve lazy routes.
  const inlinedScripts = [
    ...uniqueAsyncScripts.map((assetPath) => renderScript(basePath, assetPath)),
    ...scripts.map(({ path: assetPath }) => renderScript(basePath, assetPath)),
  ].join('');
  const bodyEnd = htmlContent.lastIndexOf('</body>');

  if (bodyEnd === -1) {
    throw new Error(
      `Client HTML does not contain a closing body tag: ${htmlFilePath}`,
    );
  }

  return `${htmlContent.slice(0, bodyEnd)}${inlinedStyles}${inlinedScripts}${htmlContent.slice(bodyEnd)}`;
};
