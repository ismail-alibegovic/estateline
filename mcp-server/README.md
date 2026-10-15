# estateline-mcp

Read-only MCP server so Claude can analyse an Estateline organization's data.

1. In Estateline, open Developer settings and create an API key with the `read` permission.
2. Build: `npm install && npm run build`
3. Add to Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "estateline": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"],
      "env": {
        "ESTATELINE_URL": "https://your-estateline-host",
        "ESTATELINE_API_KEY": "est_live_..."
      }
    }
  }
}
```

Tools: `dashboard_metrics`, `lead_conversion_report`, `agent_performance_report`, `search`.
The key only ever sees its own organization and is rate limited to 120 requests/minute.
