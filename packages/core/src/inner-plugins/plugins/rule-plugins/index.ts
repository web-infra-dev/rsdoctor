import { CircularDependencyPlugin } from "./circular-dependency";

export const circularDependencyPlugin = new CircularDependencyPlugin({
  // 在这里添加所需的选项
  exclude: /node_modules/,
  include: /src/,
  failOnError: true,
  allowAsyncCycles: false,
  cwd: process.cwd(),
});