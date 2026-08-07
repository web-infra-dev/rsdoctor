---
'@rsdoctor/sdk': patch
'@rsdoctor/utils': patch
---

Fix large manifest serialization so streamed JSON fragments are written as one deflate stream without losing the final fragment or reversing shard batches.
