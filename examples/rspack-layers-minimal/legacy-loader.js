module.exports = function legacyLoader(content) {
  return `// legacy!\n${content}`;
};
