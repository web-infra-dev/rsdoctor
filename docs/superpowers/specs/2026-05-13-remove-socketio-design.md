# Remove Socket.IO Design

## Goal

Remove the direct `socket.io` and `socket.io-client` dependencies from Rsdoctor while preserving the current local report behavior:

- Query-style server APIs continue to work for the web client and MCP server.
- Server-initiated report updates continue to reach the local web client.
- Compile progress updates continue to be streamed to the report UI.

## Architecture

Use two transport layers with narrower responsibilities:

1. HTTP `POST` for request-response APIs.
   - The browser client already exposes `postServerAPI()`.
   - The MCP server can call the same Rsdoctor HTTP APIs with Node 22 `fetch`.
   - Sharded manifest reads and local API loads should stop using socket acknowledgements.

2. Native WebSocket for server-to-client update fanout.
   - The SDK server owns one lightweight WebSocket server attached to the existing HTTP server.
   - The browser client opens a native `WebSocket` connection and dispatches inbound JSON messages by API name.
   - Server pushes keep the existing logical payload shape: `{ api, payload }`, where `payload` is the current `SocketResponseType` value used by UI consumers.

## Data Flow

### Request-response

- `LocalServerDataLoader.loadData()` uses HTTP for sharded data.
- `LocalServerDataLoader.loadAPI()` uses HTTP for local API requests.
- `packages/ai` replaces socket RPC with `fetch()` against `http://localhost:<port><api>`.

### Server push

- `sdk.server.sendAPIDataToClient()` serializes a WebSocket message and broadcasts it to all connected report pages.
- `sdk.server.broadcast()` recomputes subscribed API responses and publishes them to connected report pages.
- The browser-side WebSocket helper keeps an in-memory listener registry by API key and routes each inbound message to the matching callbacks.

## Protocol

### Browser update message

```json
{
  "api": "/api/example",
  "payload": {
    "req": {
      "api": "/api/example",
      "body": null
    },
    "res": {}
  }
}
```

### Browser subscription message

```json
{
  "type": "subscribe",
  "api": "/api/example",
  "body": null
}
```

Subscriptions replace the old server-side `socket.io` request map so later `broadcast()` calls still know which API/body pairs should be refreshed.

## Error Handling

- HTTP request failures keep using existing `fetchWithTimeout()` error handling in the browser and explicit non-2xx handling in the MCP server.
- Browser WebSocket message parsing ignores malformed payloads instead of breaking the full connection.
- SDK WebSocket publishing skips disconnected clients.
- Subscription messages with unknown APIs are ignored.

## Dependency Impact

Remove direct dependencies:

- `@rsdoctor/sdk`: `socket.io`
- `@rsdoctor/components`: `socket.io-client`
- `@rsdoctor/mcp-server`: `socket.io-client`

Add one smaller server-only dependency:

- `@rsdoctor/sdk`: `ws`

Browser and MCP client code use platform-native WebSocket or `fetch` APIs.

## Testing

Add or update tests for:

- Browser request routing now using HTTP instead of socket acknowledgements.
- Browser WebSocket message dispatch and subscription output.
- MCP request helper now using HTTP `fetch`.
- SDK WebSocket server subscription tracking and push fanout.

## Non-goals

- No attempt to preserve the exact `socket.io` reconnection semantics.
- No move to polling or SSE in this change.
- No unrelated dependency cleanup beyond the transport migration.
