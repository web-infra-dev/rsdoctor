// For SVGR.
declare module '*.svg?react' {
  import type React from 'react';

  const SVG: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default SVG;
}
