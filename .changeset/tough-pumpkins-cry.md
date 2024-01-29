---
'@rsdoctor/core': patch
---

fix(proxy-loader): proxy-loader behavior is not correct when query is string

1. fix `this.query` hits `this.resourceQuery` in loader

2. Special handling has been implemented for cases where `rule.use` is a function.
