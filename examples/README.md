# Rsdoctor Examples

This directory contains various examples demonstrating how to use Rsdoctor with different bundlers and module systems.

**To run:**

```bash
cd examples/rspack-minimal
npm install
npm run dev          # Development mode
npm run build        # Production build
npm run build:analysis # Open Rsdoctor Report
npm run test:cjs     # Test CJS functionality
```

## Other Examples

- `rspack-minimal/` - Basic Rspack setup with Rsdoctor
- `rspack-banner-minimal/` - Rspack with banner plugin
- `rspack-layers-minimal/` - Rspack with layer support
- `webpack-minimal/` - Basic Webpack setup with Rsdoctor
- `multiple-minimal/` - Multiple build tools example
- `modern-minimal/` - Modern build setup
- `rsbuild-minimal/` - Rsbuild with Rsdoctor

## Module System Comparison

| Feature         | ESM Demo                            | CJS Demo                 |
| --------------- | ----------------------------------- | ------------------------ |
| Package Type    | `"type": "module"`                  | Default (CommonJS)       |
| Config File     | `rspack.config.mjs`                 | `rspack.config.js`       |
| Import Syntax   | `import { chunk } from 'lodash-es'` | `import _ from 'lodash'` |
| Tree Shaking    | ✅ Better                           | ⚠️ Limited               |
| Bundle Size     | Smaller                             | Larger                   |
| Browser Support | Modern browsers                     | All browsers             |
