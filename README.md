# ChabadMS MCP Server

Remote MCP server exposing the ChabadMS API. Runs as a shared HTTP server; each user supplies their own API key in the connection URL.

## Tools

| Tool | Description |
|------|-------------|
| `get_recent_activity` | Recent activity across families, members, transactions, and web forms |
| `get_birthdays` | Upcoming Hebrew birthdays in the next 30 days |
| `get_yahrtzeits` | Upcoming yahrtzeits in the next 30 days |
| `get_anniversaries` | Upcoming wedding anniversaries in the next 30 days |
| `get_payments` | Payment/donation records (filter by FamilyId, PageSize, Offset) |
| `get_payment_stats` | Aggregated donation totals and averages (filter by FamilyId) |
| `search_families` | Search families by name, returns FamilyId |
| `get_contacts` | Paginated list of all contacts/members |

## Running the Server

```bash
npm install
PORT=3000 node src/index.js
```

The server listens on `PORT` (default `3000`).

## Connecting (Per-User API Key)

Each user adds `?api_key=cms_their_key` to the server URL when configuring their MCP client. This is how each user's key stays isolated on a shared server.

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "chabadms": {
      "type": "http",
      "url": "https://yourserver.com/mcp?api_key=cms_your_key_here"
    }
  }
}
```

### Claude.ai (remote MCP)

In Claude.ai settings → Integrations → Add MCP Server, enter:

```
https://yourserver.com/mcp?api_key=cms_your_key_here
```

Each user enters their own key — they each get a separate session with their own data access.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the HTTP server listens on |
