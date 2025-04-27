# @rsdoctor/mcp-server

## Usage with Claude Desktop or other MCP clients

Add to your claude_desktop_config.json or .cursor/mcp.json:

```json
{
  "mcpServers": {
    "rsdoctor": {
      "command": "/path/to/rsdoctor/packages/ai/bin/rsdoctor-mcp",
      "args": ["--port", "9988"]
    }
  }
}
```

### Note

1. `command`: Specify the path to your locally installed `rsdoctor-mcp` binary since this feature is not yet released
2. `port`: Match the port number configured in your Rsdoctor plugin settings (see https://rsdoctor.dev/config/options/options#port)
