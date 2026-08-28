# @rsdoctor/e2e

This folder contains the e2e test cases of Rsdoctor.

## Tech stack

- [Rstest](https://rstest.rs/): The test runner.
- [playwright](https://github.com/microsoft/playwright): The browser automation runtime.

## Commands

```bash
# Install playwright browser
npx playwright install chromium

# Run all test cases with Rstest
pnpm run test
```

## Add test cases

### Add test cases for common capabilities

```ts
import { expect, test } from '@test-kit/rstest';

test('test 1 + 1', () => {
  expect(1 + 1).toBe(2);
});
```
