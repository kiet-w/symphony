import { Database } from "bun:sqlite";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getBoard, claimTicket, setStatus, postSignal } from "./github.ts";

// Initialize SQLite for Locks (Bun built-in)
const db = new Database("symphony_locks.sqlite");
db.run(`
  CREATE TABLE IF NOT EXISTS locks (
    ticket_id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Initialize MCP Server
const server = new Server(
  {
    name: "symphony-mcp",
    version: "1.0.0",
  },
  {
    capabilities: { tools: {} },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "claim_ticket",
        description: "Agent claims a ticket. Implements strict SQLite locking to prevent race conditions.",
        inputSchema: {
          type: "object",
          properties: {
            ticketId: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["ticketId", "agentId"],
        },
      },
      {
        name: "set_status",
        description: "Update the status of a ticket.",
        inputSchema: {
          type: "object",
          properties: {
            ticketId: { type: "string" },
            status: { type: "string", enum: ["Todo", "In Progress", "Review", "Done"] }
          },
          required: ["ticketId", "status"],
        },
      },
      {
        name: "post_signal",
        description: "Post a compact low-token signal.",
        inputSchema: {
          type: "object",
          properties: {
            ticketId: { type: "string" },
            payload: { type: "string" }
          },
          required: ["ticketId", "payload"],
        },
      },
      {
        name: "get_board",
        description: "Read the current status of all tickets.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      }
    ],
  };
});

// ponytail: extract helper to shrink triplicated validation
const parseTicketId = (id: string) => {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed)) throw new Error(`Invalid ticketId: ${id}`);
  return parsed;
};

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "claim_ticket": {
        const { ticketId, agentId } = args as { ticketId: string; agentId: string };
        const parsedTicketId = parseTicketId(ticketId);
        
        try {
          db.run(`INSERT INTO locks (ticket_id, agent_id) VALUES (?, ?)`, [ticketId, agentId]);
        } catch (error: any) {
          if (error.message.includes("UNIQUE constraint failed")) {
            // Read who currently holds the lock
            const currentOwner = db.query(`SELECT agent_id FROM locks WHERE ticket_id = ?`).get(ticketId) as any;
            return {
              content: [{ type: "text", text: `Lỗi Race Condition: Ticket ${ticketId} đã bị claim bởi agent ${currentOwner?.agent_id} trước đó!` }],
              isError: true,
            };
          }
          throw error;
        }

        try {
          await claimTicket(parsedTicketId, agentId);
        } catch (error) {
          db.run(`DELETE FROM locks WHERE ticket_id = ?`, [ticketId]);
          throw error;
        }
        
        console.error(`[Symphony] 🔒 Agent ${agentId} claimed ticket ${ticketId}`);
        return {
          content: [{ type: "text", text: `Lock acquired & successfully claimed ticket ${ticketId} for agent ${agentId}.` }]
        };
      }

      case "set_status": {
        const { ticketId, status } = args as { ticketId: string; status: string };
        const parsedTicketId = parseTicketId(ticketId);
        await setStatus(parsedTicketId, status);
        return {
          content: [{ type: "text", text: `Successfully updated status of ticket ${ticketId} to ${status}.` }]
        };
      }

      case "post_signal": {
        const { ticketId, payload } = args as { ticketId: string; payload: string };
        const parsedTicketId = parseTicketId(ticketId);
        await postSignal(parsedTicketId, payload);
        return {
          content: [{ type: "text", text: `Successfully posted signal to ticket ${ticketId}.` }]
        };
      }

      case "get_board": {
        const boardData = await getBoard();
        return {
          content: [{ type: "text", text: JSON.stringify(boardData, null, 2) }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Boot the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Symphony MCP Server (Bun + SQLite) running on stdio");
}

main().catch(console.error);
