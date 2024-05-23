import { Compiler } from '@rspack/core';
const execSync = require('child_process').execSync;
const pkg = require('./package.json');

class RuntimeWrapperWebpackPluginImpl {
  name = 'RuntimeWrapperWebpackPlugin';

  constructor(public compiler: Compiler) {
    const { BannerPlugin } = compiler.webpack;
    const kind = process.env.KIND || null;

    const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    const version = !kind
      ? pkg.version
      : `${pkg.version}-${kind}+${commitHash}`;
    const banner = `${pkg.name} ${111} by @liabru
      ${'Experimental pre-release build.\n  '}${pkg.homepage}
      License ${pkg.license}${version}`;
    // banner
    new BannerPlugin({
      test: /\.js/,
      raw: true,
      banner,
    }).apply(compiler);

    // footer
    new BannerPlugin({
      test: /\.js/,
      footer: true,
      raw: true,
      banner,
    }).apply(compiler);
  }
}

export default RuntimeWrapperWebpackPluginImpl;
