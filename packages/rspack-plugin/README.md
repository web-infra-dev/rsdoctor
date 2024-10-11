# Rsdoctor plugin

This Rsdoctor plugin is an analysis plugin for the Rspack builder.

## features

- Rsdoctor is a one-stop tool for diagnosing and analyzing the build process and build artifacts.
- Rsdoctor is a tool that supports Webpack and Rspack build analysis.
- Rsdoctor is an analysis tool that can display the time-consuming and behavioral details of the compilation.
- Rsdoctor is a tool that provides bundle Diff and other anti-degradation capabilities simultaneously.

## Note

This plugin is used by the `Rspack` repo to open Rsdoctor, [Quick Start](https://rsdoctor.dev/guide/start/quick-start).

Initialize the RsdoctorRspackPlugin in the [plugins](https://www.rspack.dev/config/plugins.html#plugins) of `rspack.config.js`:

```js title="rspack.config.js"
const { RsdoctorRspackPlugin } = require('@rsdoctor/rspack-plugin');

module.exports = {
  // ...
  plugins: [
    // Only register the plugin when RSDOCTOR is true, as the plugin will increase the build time.
    process.env.RSDOCTOR &&
      new RsdoctorRspackPlugin({
        // plugin options
      }),
  ].filter(Boolean),
};
```

## Documentation

https://rsdoctor.dev/

## Contributing

Please read the [Contributing Guide](https://github.com/web-infra-dev/rsdoctor/blob/main/CONTRIBUTING.md).

## License

Rsdoctor is [MIT licensed](https://github.com/web-infra-dev/rsdoctor/blob/main/LICENSE).
