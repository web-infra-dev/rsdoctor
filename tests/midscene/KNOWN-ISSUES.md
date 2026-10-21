# Known issues

## Bundle diff assets tab can stall the renderer

Observed on 2026-10-14 against source commit
`ad38e51666dc5e13a3cbf9e1fab862a7810c158e`.

Opening the comparison overview succeeds. Activating **Assets** stalls the
Chromium renderer, which consumes more than one CPU core. The click and subsequent
screenshots do not complete. This reproduced with both the size-filter fixture
and a separate small build, and with a model-free Playwright click. Pausing the
renderer showed repeating render-stack frames.

This is not evidence of a model planning failure. The original
`e2e/cases/doctor-rspack/bundle-diff.test.ts` checks the overview and tab entries;
it does not activate the tabs. At the user's direction, the Midscene migration
preserves that original scope. It does **not** claim that tab activation works,
and no product code is changed here.

With `npm run serve` running, reproduce without model credentials:

```sh
node scripts/reproduce-diff-assets.mjs
```

A renderer stall results in a nonzero exit. The script uses a fresh browser,
does not modify reports or product code, and closes the browser afterward.

## Seed response parsing can omit a file chooser registration

In fork CI run `38527645392`, 12 of 13 cases passed. The upload case's raw model
reply contained consecutive `RegisterFileChooserAccept` and `Tap` action blocks,
but the parsed action list contained only `Tap`. No registration appeared among
the executed tasks, so clicking the upload area did not attach the manifest.
Local runs had passed when registration and clicking were planned separately.

The upload case now supplies its known synthetic file through the framework's
`fileChooserAccept` option. The UI click remains AI-driven, and independent
assertions still verify the uploaded report and its assets. This avoids relying
on response parsing for fixture provisioning; it does not patch the product or
the framework parser.
