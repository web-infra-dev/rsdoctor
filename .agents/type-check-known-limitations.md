# Type-check Known limitations

## Rspack compiler wrapper

`Plugin.BaseCompiler` currently combines Rspack's `Compiler` and `MultiCompiler`
types. The test suite constructs a normal `Compiler`, which does not provide the
`MultiCompiler` members required by that wrapper.

Tests that call `RsdoctorRspackPlugin.done()` use a local assertion until the
production compiler type is refactored to model the two Rspack compiler variants
separately.
