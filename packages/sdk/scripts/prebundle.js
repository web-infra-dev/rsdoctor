#!/usr/bin/env node

import { build } from 'esbuild';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load prebundle configuration
const config = await import('./prebundle.config.js');

async function prebundle() {
  console.log('🚀 Starting prebundle process...');

  const { dependencies, exclude, build: buildConfig, output } = config.default;

  // Create prebundle directory
  if (!fs.existsSync(output.dir)) {
    fs.mkdirSync(output.dir, { recursive: true });
  }

  for (const dep of dependencies) {
    try {
      console.log(`📦 Prebundling ${dep}...`);

      const outfile = path.join(
        path.join(__dirname, '../compiled'),
        output.filename.replace('[name]', dep),
      );

      const result = await build({
        entryPoints: [dep],
        bundle: true,
        outfile,
        external: exclude,
        ...buildConfig,
      });

      console.log(`✅ Successfully prebundled ${dep} -> ${outfile}`);
    } catch (error) {
      console.error(`❌ Failed to prebundle ${dep}:`, error.message);
    }
  }

  console.log('🎉 Prebundle process completed!');
  console.log(`📁 Prebundled files saved to: ${output.dir}`);
}

prebundle().catch(console.error);
