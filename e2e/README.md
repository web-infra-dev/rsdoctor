# @rsdoctor/e2e

This folder contains the e2e test cases of Rsdoctor.

## Tech stack

- [playwright](https://github.com/microsoft/playwright): The e2e test framework.

## Commands

```bash
# Install playwright browser
npx playwright install chromium

# Run all Rspack test cases
pnpm run test
```

## Add test cases

### Add test cases for common capabilities

Test cases added using the `test` method will run in the Rspack suite.

```ts
import { expect, test } from '@playwright/test';
// will pass in rspack
test('test 1 + 1', () => {
  expect(1 + 1).toBe(2);
});
```
