const { RsdoctorWebpackPlugin } = require('../../dist/index');

const plugin = new RsdoctorWebpackPlugin({});

plugin.sdk.bootstrap().then(() => {
  console.log(plugin.sdk.server.port);
});
