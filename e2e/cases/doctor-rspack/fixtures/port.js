const { RsdoctorRspackPlugin } = require('../../../dist/index');

const plugin = new RsdoctorRspackPlugin({});

plugin.sdk.bootstrap().then(() => {
  console.log(plugin.sdk.server.port);
});
