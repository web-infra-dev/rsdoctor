import { rsbuild, rspack } from '@rslib/core';
import { dualPackageBundleless } from '../../scripts/rslib.base.config';

export default rsbuild.mergeRsbuildConfig(dualPackageBundleless, {
  tools: {
    rspack: {
      plugins: [
        new rspack.BannerPlugin({
          banner: (args) => {
            if (args.filename === 'inner-plugins/loaders/proxy.js') {
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
