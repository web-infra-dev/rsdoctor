# Rsdoctor plugin

This Rsdoctor plugin is an analysis plugin for the Webpack builder.

## features

- Rsdoctor is a one-stop tool for diagnosing and analyzing the build process and build artifacts.
- Rsdoctor is a tool that supports Webpack and Rspack build analysis.
- Rsdoctor is an analysis tool that can display the time-consuming and behavioral details of the compilation.
- Rsdoctor is a tool that provides bundle Diff and other anti-degradation capabilities simultaneously.

## Note

This plugin is used by the `Webpack` repo to open Rsdoctor, [Quik Start](https://rsdoctor.dev/guide/start/quick-start).

Initialize the RsdoctorWebpackPlugin plugin in the [plugins](https://webpack.js.org/configuration/plugins/#plugins) section of the `webpack.config.js` file, as shown below:

```js title="webpack.config.js"
const { RsdoctorWebpackPlugin } = require('@rsdoctor/webpack-plugin');

module.exports = {
  // ...
  plugins: [
    process.env.RSDOCTOR &&
      new RsdoctorWebpackPlugin({
        // options
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
