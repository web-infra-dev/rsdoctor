import { baseBuildConfig } from '../../scripts/rslib.base.config';

const rslibConfig = {
  ...baseBuildConfig,
  ...{
    source: {
      tsconfigPath: 'tsconfig.build.json',
    },
  },
};

export default rslibConfig;
