# Remove Socket.IO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Socket.IO with HTTP request-response calls plus a lightweight native WebSocket push channel.

**Architecture:** Browser and MCP queries move to HTTP. The SDK server retains a single WebSocket server for subscriptions and server-pushed updates, with the browser dispatching inbound JSON messages by API key.

**Tech Stack:** TypeScript, Rstest, Node 22 fetch/WebSocket client, `ws` WebSocket server, existing Rsdoctor HTTP router.

---

### Task 1: Browser transport tests

**Files:**

- Modify: `packages/components/src/utils/request.test.ts`
- Create: `packages/components/src/utils/socket.test.ts`

- [ ] **Step 1: Write failing HTTP local loader expectations**

Add browser-side tests that prove request-response helpers stay HTTP-based and do not rely on socket acknowledgements.

- [ ] **Step 2: Write failing WebSocket dispatch expectations**

---

Test that the browser WebSocket helper:

```ts
const unsubscribe = subscribeServerAPI('/api/demo', callback);
publishServerSocketMessage({
  api: '/api/demo',
  payload: { req: { api: '/api/demo', body: null }, res: { ok: true } },
});
expect(callback).toHaveBeenCalled();
unsubscribe();
```

- [ ] **Step 3: Run focused component tests and confirm they fail**

Run:

```bash
pnpm --filter @rsdoctor/components run test -- request.test.ts socket.test.ts
```

Expected: new socket helper exports are missing.

### Task 2: Browser transport implementation

**Files:**

- Modify: `packages/components/src/utils/socket.ts`
- Modify: `packages/components/src/utils/data/local.ts`

- [ ] **Step 1: Implement browser WebSocket wrapper**

Create a native WebSocket client with:

- one connection per URL
- listener registry by API
- subscription messages shaped as `{ type: 'subscribe', api, body }`
- inbound update dispatch shaped as `{ api, payload }`

- [ ] **Step 2: Switch local data loading back to HTTP**

Replace old socket acknowledgements with:

```ts
const res = await postServerAPI(...args);
```

and sharding loads with:

```ts
await postServerAPI(SDK.ServerAPI.API.LoadDataByKey, { key });
```

- [ ] **Step 3: Verify browser tests pass**

Run:

```bash
pnpm --filter @rsdoctor/components run test -- request.test.ts socket.test.ts
```

### Task 3: MCP HTTP helper tests and implementation

**Files:**

- Modify: `packages/ai/tests/socket.test.ts`
- Modify: `packages/ai/src/server/socket.ts`

- [ ] **Step 1: Replace old socket test with a failing fetch test**

Assert that `sendRequest()` performs a `POST` to:

```ts
http://localhost:3000/api/example
```

and returns parsed JSON.

- [ ] **Step 2: Run AI socket test and confirm it fails**

Run:

```bash
pnpm --filter @rsdoctor/mcp-server run test -- socket.test.ts
```

- [ ] **Step 3: Implement HTTP request helper**

Use `fetch()` with JSON body and non-2xx error handling. Keep `getPortFromArgs()` and `getMcpPort()` intact.

- [ ] **Step 4: Verify AI socket test passes**

Run:

```bash
pnpm --filter @rsdoctor/mcp-server run test -- socket.test.ts
```

### Task 4: SDK WebSocket tests and implementation

**Files:**

- Create: `packages/sdk/tests/server/websocket.test.ts`
- Modify: `packages/sdk/src/sdk/server/socket/index.ts`
- Modify: `packages/sdk/src/sdk/server/index.ts`

- [ ] **Step 1: Write failing server subscription test**

Assert that a WebSocket subscription message stores the API/body pair used later by `broadcast()`.

- [ ] **Step 2: Write failing push fanout test**

Assert that `sendAPIData()` serializes `{ api, payload }` and sends it to all connected clients.

- [ ] **Step 3: Run focused SDK test and confirm failure**

Run:

```bash
pnpm --filter @rsdoctor/sdk run test -- websocket.test.ts
```

- [ ] **Step 4: Implement `ws` server**

Attach `WebSocketServer` to the existing HTTP server, parse subscription messages, retain API/body subscriptions, publish JSON updates, and close connections in `dispose()`.

- [ ] **Step 5: Verify SDK WebSocket test passes**

Run:

```bash
pnpm --filter @rsdoctor/sdk run test -- websocket.test.ts
```

### Task 5: Dependency cleanup and full verification

**Files:**

- Modify: `packages/sdk/package.json`
- Modify: `packages/components/package.json`
- Modify: `packages/ai/package.json`
- Modify: `packages/ai/prebundle.config.mjs`
- Modify: `packages/client/rsbuild.config.ts`

- [ ] **Step 1: Remove Socket.IO dependency declarations**

Delete `socket.io` and `socket.io-client` declarations and remove stale prebundle/chunk-splitting references.

- [ ] **Step 2: Add `ws` to SDK dependencies**

Declare `ws` as the smaller server-side WebSocket dependency.

- [ ] **Step 3: Run target package tests**

Run:

```bash
pnpm --filter @rsdoctor/components run test
pnpm --filter @rsdoctor/mcp-server run test
pnpm --filter @rsdoctor/sdk run test
```

- [ ] **Step 4: Run target package builds**

Run:

```bash
pnpm --filter @rsdoctor/components run build
pnpm --filter @rsdoctor/mcp-server run build
pnpm --filter @rsdoctor/sdk run build
```

- [ ] **Step 5: Inspect remaining `socket.io` references**

Run:

```bash
rg -n 'socket\\.io|socket.io-client' packages pnpm-lock.yaml
```

Expected: no direct source/package references remain.
