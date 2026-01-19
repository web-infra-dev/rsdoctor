# JWT Security Vulnerability Fix

## Summary

Fixed a critical JWT algorithm confusion vulnerability in the hono JWT middleware by upgrading from version 3.12.12 to 4.11.4.

## Vulnerability Details

### Issue

- **Vulnerability Type**: JWT Algorithm Confusion / Unsafe Default (HS256)
- **Severity**: High
- **Affected Version**: hono@3.12.12
- **Fixed Version**: hono@4.11.4
- **Note**: This is a general JWT algorithm confusion vulnerability category, not a specific CVE

### Description

The JWT middleware in hono@3.12.12 had an unsafe default algorithm parameter (`alg = "HS256"`), which could lead to:

1. JWT algorithm confusion attacks
2. Token forgery
3. Authentication bypass

The vulnerability existed in the `verify()` function:

```javascript
// Vulnerable code (hono@3.12.12)
var verify = async (token, secret, alg = 'HS256') => {
  // No validation of algorithm match
};
```

## Fix Applied

### Changes Made

1. Upgraded hono from 3.12.12 to 4.11.4 in packages/ai/package.json
2. Updated pnpm-lock.yaml to resolve to the secure version

### How the Fix Works

Hono@4.11.4 implements proper JWT security by:

1. **Requiring Algorithm Parameter**:

   ```javascript
   if (!algOrOptions) {
     throw new JwtAlgorithmRequired();
   }
   ```

2. **Validating Algorithm Match**:

   ```javascript
   if (header.alg !== alg) {
     throw new JwtAlgorithmMismatch(alg, header.alg);
   }
   ```

3. **No Unsafe Defaults**:
   - Algorithm must be explicitly specified
   - JWT header algorithm is validated against expected algorithm
   - Throws exceptions on mismatch or missing algorithm

## Impact

- **Before**: JWT tokens could potentially be forged using algorithm confusion
- **After**: JWT verification requires explicit algorithm specification and validates it

## Testing

- Build verification: ✅ Passed
- No breaking changes in dependency resolution
- @modelcontextprotocol/sdk correctly resolves to hono@4.11.4

## References

- Hono JWT Middleware: https://hono.dev/docs/middleware/builtin/jwt
- JWT Algorithm Confusion: https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/
