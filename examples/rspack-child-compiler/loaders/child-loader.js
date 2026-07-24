module.exports = function childLoader(source) {
  return `/* processed by child-loader */\n${source}`;
};
