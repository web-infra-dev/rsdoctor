---
'@rsdoctor/core': patch
'@rsdoctor/shared': patch
---

Reduce the `@rsdoctor/core` install size by bundling the shared collection helpers instead of shipping `es-toolkit` as a production dependency.
