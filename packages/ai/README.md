# @rsdoctor/ai

## Usage with Claude Desktop or other MCP clients

Add to your claude_desktop_config.json or .cursor/mcp.json:

```js
{
  "mcpServers": {
    "rsdoctor": {
      "command": "/path/to/rsdoctor/packages/ai/bin/rsdoctor-mcp", // Not yet released, needs to be installed locally and the path specified manually
      "args": [
        "--port",
        "9988" // or any other port you configured in the Rsdoctor plugin. https://rsdoctor.dev/config/options/options#port
      ]
    }
  }
}
```
