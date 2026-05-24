#!/usr/bin/env node
import { createServer } from "http";
import { randomUUID } from "crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_URL = "https://cms-connect.base44.app/functions/cmsApiGateway";
const PORT = process.env.PORT ?? 3000;

async function callApi(apiKey, endpoint, payload = {}) {
  const body = { endpoint, ...(Object.keys(payload).length ? { payload } : {}) };
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

const NO_KEY_MSG =
  "No API key configured. Add ?api_key=cms_your_key to your MCP server URL.";

function createMcpServer(apiKey) {
  const server = new Server(
    { name: "cmsmcpserver", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "get_recent_activity",
        description:
          "Get recent activity across families, members, transactions, and web forms.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_birthdays",
        description: "Get upcoming Hebrew birthdays in the next 30 days.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_yahrtzeits",
        description: "Get upcoming yahrtzeits in the next 30 days.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_anniversaries",
        description: "Get upcoming wedding anniversaries in the next 30 days.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_payments",
        description:
          "Get a list of payment/donation records, optionally filtered by FamilyId, amounts, categories, etc.",
        inputSchema: {
          type: "object",
          properties: {
            FamilyId: { type: "number", description: "Filter by family ID." },
            PageSize: { type: "number", description: "Number of records per page (default 25)." },
            Offset: { type: "number", description: "Page offset (1-based)." },
          },
        },
      },
      {
        name: "get_payment_stats",
        description:
          "Get aggregated donation totals and averages, optionally filtered by FamilyId.",
        inputSchema: {
          type: "object",
          properties: {
            FamilyId: { type: "number", description: "Filter by family ID (omit for all families)." },
          },
        },
      },
      {
        name: "search_families",
        description:
          "Search families by name. Returns matching family records with FamilyId.",
        inputSchema: {
          type: "object",
          properties: {
            search: { type: "string", description: "Name search term (e.g. 'Cohen')." },
            pageSize: { type: "number", description: "Number of results per page (default 10)." },
            offset: { type: "number", description: "Page offset (1-based)." },
          },
          required: ["search"],
        },
      },
      {
        name: "get_contacts",
        description: "Get a paginated list of all contacts/members.",
        inputSchema: {
          type: "object",
          properties: {
            pageSize: { type: "number", description: "Number of records per page (default 25)." },
            offset: { type: "number", description: "Page offset (1-based)." },
          },
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    if (!apiKey) {
      return { content: [{ type: "text", text: NO_KEY_MSG }], isError: true };
    }

    try {
      let result;
      switch (name) {
        case "get_recent_activity":
          result = await callApi(apiKey, "recentActivity");
          break;
        case "get_birthdays":
          result = await callApi(apiKey, "birthdays");
          break;
        case "get_yahrtzeits":
          result = await callApi(apiKey, "yahrtzeits");
          break;
        case "get_anniversaries":
          result = await callApi(apiKey, "anniversaries");
          break;
        case "get_payments": {
          const payload = {};
          if (args.FamilyId !== undefined) payload.FamilyId = args.FamilyId;
          if (args.PageSize !== undefined) payload.PageSize = args.PageSize;
          if (args.Offset !== undefined) payload.Offset = args.Offset;
          result = await callApi(apiKey, "payments", payload);
          break;
        }
        case "get_payment_stats": {
          result = await callApi(apiKey, "paymentStats", { FamilyId: args.FamilyId ?? null });
          break;
        }
        case "search_families": {
          const payload = { search: args.search };
          if (args.pageSize !== undefined) payload.pageSize = args.pageSize;
          if (args.offset !== undefined) payload.offset = args.offset;
          result = await callApi(apiKey, "searchFamilies", payload);
          break;
        }
        case "get_contacts": {
          const payload = {};
          if (args.pageSize !== undefined) payload.pageSize = args.pageSize;
          if (args.offset !== undefined) payload.offset = args.offset;
          result = await callApi(apiKey, "contacts", payload);
          break;
        }
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
    }
  });

  return server;
}

// sessionId -> StreamableHTTPServerTransport
const sessions = new Map();
// sessionId -> apiKey string (may be null)
const apiKeys = new Map();

const httpServer = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost`);
    const sessionId = req.headers["mcp-session-id"];

    if (sessionId) {
      const transport = sessions.get(sessionId);
      if (!transport) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Session not found" }));
        return;
      }
      await transport.handleRequest(req, res);
      return;
    }

    // New session — read the api_key from query params
    const apiKey = url.searchParams.get("api_key") || null;
    const newSessionId = randomUUID();

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => newSessionId,
      onsessioninitialized: (id) => {
        sessions.set(id, transport);
        apiKeys.set(id, apiKey);
      },
      onsessionclosed: (id) => {
        sessions.delete(id);
        apiKeys.delete(id);
      },
    });

    const mcpServer = createMcpServer(apiKey);
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res);
  } catch (err) {
    console.error("Request error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }
});

httpServer.listen(PORT, () => {
  console.log(`CMS MCP server listening on port ${PORT}`);
});
