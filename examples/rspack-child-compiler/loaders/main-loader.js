module.exports = function mainLoader(source) {
  return `/* processed by main-loader */\n${source}`;
};
