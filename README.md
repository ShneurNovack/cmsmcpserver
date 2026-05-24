# ChabadMS MCP Server

MCP server exposing the ChabadMS API so any MCP-compatible AI client (Claude Desktop, etc.) can query your congregation data.

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

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set your API key

```bash
export CMS_API_KEY=cms_your_key_here
```

### 3. Run the server

```bash
npm start
```

## Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cmsmcpserver": {
      "command": "node",
      "args": ["/absolute/path/to/cmsmcpserver/src/index.js"],
      "env": {
        "CMS_API_KEY": "cms_your_key_here"
      }
    }
  }
}
```

Or if installed globally via npm:

```json
{
  "mcpServers": {
    "cmsmcpserver": {
      "command": "npx",
      "args": ["cmsmcpserver"],
      "env": {
        "CMS_API_KEY": "cms_your_key_here"
      }
    }
  }
}
```
