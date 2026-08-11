---
'@rsdoctor/sdk': patch
'@rsdoctor/utils': patch
---

Fix large manifest serialization so streamed JSON fragments use one continuous deflate/Base64 stream, are written and read with bounded sharding buffers, and do not lose or reorder fragments.
