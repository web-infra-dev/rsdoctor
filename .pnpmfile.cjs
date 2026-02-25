function readPackage(pkg, _context) {
  if (
    pkg.name &&
    (pkg.name.startsWith('@rslib/') || pkg.name.startsWith('@rsbuild/'))
  ) {
    return pkg;
  }

  const rspackOverrides = {
    '@rspack/cli': '2.0.0-beta.2',
    '@rspack/core': '2.0.0-beta.2',
  };

  for (const [name, version] of Object.entries(rspackOverrides)) {
    if (pkg.dependencies?.[name]) {
      pkg.dependencies[name] = version;
    }
    if (pkg.devDependencies?.[name]) {
      pkg.devDependencies[name] = version;
    }
  }

  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
