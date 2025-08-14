import { dualPackage } from '../../scripts/rslib.base.config';

const rslibConfig = {
  ...dualPackage,
  ...{
    source: {
      tsconfigPath: 'tsconfig.build.json',
    },
  },
};

export default rslibConfig;
