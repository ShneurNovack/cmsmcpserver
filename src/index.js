#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_URL = "https://cms-connect.base44.app/functions/cmsApiGateway";
const API_KEY = process.env.CMS_API_KEY;

async function callApi(endpoint, payload = {}) {
  if (!API_KEY) {
    throw new Error("CMS_API_KEY environment variable is not set");
  }
  const body = { endpoint, ...(Object.keys(payload).length ? { payload } : {}) };
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

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
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "get_birthdays",
      description: "Get upcoming Hebrew birthdays in the next 30 days.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "get_yahrtzeits",
      description: "Get upcoming yahrtzeits in the next 30 days.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "get_anniversaries",
      description: "Get upcoming wedding anniversaries in the next 30 days.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "get_payments",
      description:
        "Get a list of payment/donation records, optionally filtered by FamilyId, amounts, categories, etc.",
      inputSchema: {
        type: "object",
        properties: {
          FamilyId: {
            type: "number",
            description: "Filter by family ID.",
          },
          PageSize: {
            type: "number",
            description: "Number of records per page (default 25).",
          },
          Offset: {
            type: "number",
            description: "Page offset (1-based).",
          },
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
          FamilyId: {
            type: "number",
            description: "Filter by family ID (omit for all families).",
          },
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
          search: {
            type: "string",
            description: "Name search term (e.g. 'Cohen').",
          },
          pageSize: {
            type: "number",
            description: "Number of results per page (default 10).",
          },
          offset: {
            type: "number",
            description: "Page offset (1-based).",
          },
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
          pageSize: {
            type: "number",
            description: "Number of records per page (default 25).",
          },
          offset: {
            type: "number",
            description: "Page offset (1-based).",
          },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    let result;

    switch (name) {
      case "get_recent_activity":
        result = await callApi("recentActivity");
        break;
      case "get_birthdays":
        result = await callApi("birthdays");
        break;
      case "get_yahrtzeits":
        result = await callApi("yahrtzeits");
        break;
      case "get_anniversaries":
        result = await callApi("anniversaries");
        break;
      case "get_payments": {
        const payload = {};
        if (args.FamilyId !== undefined) payload.FamilyId = args.FamilyId;
        if (args.PageSize !== undefined) payload.PageSize = args.PageSize;
        if (args.Offset !== undefined) payload.Offset = args.Offset;
        result = await callApi("payments", payload);
        break;
      }
      case "get_payment_stats": {
        const payload = { FamilyId: args.FamilyId ?? null };
        result = await callApi("paymentStats", payload);
        break;
      }
      case "search_families": {
        const payload = { search: args.search };
        if (args.pageSize !== undefined) payload.pageSize = args.pageSize;
        if (args.offset !== undefined) payload.offset = args.offset;
        result = await callApi("searchFamilies", payload);
        break;
      }
      case "get_contacts": {
        const payload = {};
        if (args.pageSize !== undefined) payload.pageSize = args.pageSize;
        if (args.offset !== undefined) payload.offset = args.offset;
        result = await callApi("contacts", payload);
        break;
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
