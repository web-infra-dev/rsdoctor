import { rsbuild, rspack } from '@rslib/core';
import { dualPackageBundleless } from '../../scripts/rslib.base.config';
import path from 'path';

export default rsbuild.mergeRsbuildConfig(dualPackageBundleless, {
  tools: {
    rspack: {
      plugins: [
        new rspack.BannerPlugin({
          banner: (args) => {
            const normalizedFilename = path.posix.normalize(
              args.filename.replace(/\\/g, '/'),
            );
            if (normalizedFilename === 'inner-plugins/loaders/proxy.js') {
              return 'module.exports = loaderModule; // This is a proxy loader, do not remove this line';
            }
            return '';
          },
          footer: true,
          raw: true,
        }),
      ],
    },
  },
});
