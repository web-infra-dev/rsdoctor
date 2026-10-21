import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
const cdp = await page.context().newCDPSession(page);
await cdp.send('Debugger.enable');
cdp.on('Debugger.paused', (event) => {
  console.log(
    'Renderer stack:',
    event.callFrames.slice(0, 6).map((frame) => ({
      function: frame.functionName,
      location: frame.location,
    })),
  );
});

try {
  const manifest = 'http://127.0.0.1:4174/api/bundle_diff/manifest.json';
  await page.goto(
    'http://127.0.0.1:4174/diff.html?__bundle_files__=' +
      encodeURIComponent(manifest + ',' + manifest) +
      '#/resources/bundle/diff',
  );
  const assets = page.getByRole('tab', { name: 'Assets', exact: true });
  await assets.waitFor({ timeout: 10_000 });
  const click = assets.click({ timeout: 5000 }).then(
    () => ({ passed: true }),
    (error) => ({ passed: false, error: error.message }),
  );
  const deadline = setTimeout(() => {
    void cdp
      .send('Debugger.pause')
      .then(() => cdp.send('Debugger.resume'))
      .catch(() => {});
  }, 2000);
  try {
    const result = await click;
    if (!result.passed) throw new Error(result.error);
    console.log(
      'Assets click completed; verify the selected panel before claiming the issue is fixed.',
    );
  } finally {
    clearTimeout(deadline);
  }
} finally {
  await browser.close();
}
