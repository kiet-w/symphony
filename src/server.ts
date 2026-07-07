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
const recentLogs: string[] = [];
function addLog(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.error(line);
  recentLogs.push(line);
  if (recentLogs.length > 50) recentLogs.shift();
}
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
    capabilities: { tools: {}, logging: {} },
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
        
        addLog(`🔒 Agent ${agentId} claimed ticket ${ticketId}`);
        server.sendLoggingMessage({ level: "info", data: "Board updated" });
        return {
          content: [{ type: "text", text: `Lock acquired & successfully claimed ticket ${ticketId} for agent ${agentId}.` }]
        };
      }

      case "set_status": {
        const { ticketId, status } = args as { ticketId: string; status: string };
        const parsedTicketId = parseTicketId(ticketId);
        await setStatus(parsedTicketId, status);
        server.sendLoggingMessage({ level: "info", data: "Board updated" });
        return {
          content: [{ type: "text", text: `Successfully updated status of ticket ${ticketId} to ${status}.` }]
        };
      }

      case "post_signal": {
        const { ticketId, payload } = args as { ticketId: string; payload: string };
        const parsedTicketId = parseTicketId(ticketId);
        await postSignal(parsedTicketId, payload);
        server.sendLoggingMessage({ level: "info", data: "Board updated" });
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
  addLog("Symphony MCP Server (Bun + SQLite) running on stdio");
  
  // ponytail: Optional HTTP server for operator monitoring (status dashboard, live logs)
  if (process.env.ENABLE_HTTP_SERVER === "true") {
    try {
      Bun.serve({
        port: 4000,
        async fetch(req) {
          const url = new URL(req.url);
          
          // Handle CORS
          if (req.method === "OPTIONS") {
            return new Response(null, {
              headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
              }
            });
          }

          const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
          };

          if (url.pathname === "/api/status") {
            try {
              const activeLocks = db.query("SELECT * FROM locks").all();
              let board = null;
              try {
                board = await getBoard();
              } catch (e) {
                addLog(`Error fetching board: ${e}`);
              }
              return Response.json({ locks: activeLocks, logs: recentLogs, board }, {
                headers: corsHeaders
              });
            } catch (e: any) {
              return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
            }
          }

          if (url.pathname === "/api/claim" && req.method === "POST") {
            try {
              const body = await req.json();
              const { ticketId, agentId } = body;
              
              const parsedTicketId = parseInt(ticketId, 10);
              if (isNaN(parsedTicketId)) throw new Error(`Invalid ticketId: ${ticketId}`);
              
              try {
                db.run(`INSERT INTO locks (ticket_id, agent_id) VALUES (?, ?)`, [ticketId, agentId]);
              } catch (error: any) {
                if (error.message.includes("UNIQUE constraint failed")) {
                  const currentOwner = db.query(`SELECT agent_id FROM locks WHERE ticket_id = ?`).get(ticketId) as any;
                  return Response.json({ 
                    error: `Race Condition: Ticket ${ticketId} already claimed by ${currentOwner?.agent_id}` 
                  }, { status: 409, headers: corsHeaders });
                }
                throw error;
              }

              try {
                await claimTicket(parsedTicketId, agentId);
              } catch (error) {
                db.run(`DELETE FROM locks WHERE ticket_id = ?`, [ticketId]);
                throw error;
              }
              
              addLog(`🔒 Agent ${agentId} claimed ticket ${ticketId}`);
              return Response.json({ 
                success: true, 
                message: `Lock acquired & claimed ticket ${ticketId} for agent ${agentId}` 
              }, { headers: corsHeaders });
            } catch (e: any) {
              return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
            }
          }

          if (url.pathname === "/api/status" && req.method === "POST") {
            try {
              const body = await req.json();
              const { ticketId, status } = body;
              
              const parsedTicketId = parseInt(ticketId, 10);
              if (isNaN(parsedTicketId)) throw new Error(`Invalid ticketId: ${ticketId}`);
              
              await setStatus(parsedTicketId, status);
              addLog(`📊 Ticket ${ticketId} status set to ${status}`);
              
              return Response.json({ 
                success: true, 
                message: `Updated status of ticket ${ticketId} to ${status}` 
              }, { headers: corsHeaders });
            } catch (e: any) {
              return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
            }
          }

          if (url.pathname === "/api/signal" && req.method === "POST") {
            try {
              const body = await req.json();
              const { ticketId, payload } = body;
              
              const parsedTicketId = parseInt(ticketId, 10);
              if (isNaN(parsedTicketId)) throw new Error(`Invalid ticketId: ${ticketId}`);
              
              await postSignal(parsedTicketId, payload);
              addLog(`📡 Signal posted to ticket ${ticketId}: ${payload}`);
              
              return Response.json({ 
                success: true, 
                message: `Posted signal to ticket ${ticketId}` 
              }, { headers: corsHeaders });
            } catch (e: any) {
              return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
            }
          }


          // Serve static Vite frontend
          if (!url.pathname.startsWith("/api/")) {
            let filePath = url.pathname;
            if (filePath === "/") filePath = "/index.html";
            
            const path = require("path");
            // import.meta.dir is src/, so we go up one level to symphony/
            const projectRoot = path.resolve(import.meta.dir, "..");
            const absolutePath = path.join(projectRoot, "frontend", "dist", filePath);
            
            const file = Bun.file(absolutePath);
            if (await file.exists()) {
              return new Response(file);
            }
            // Fallback for SPA routing
            const indexHtml = Bun.file(path.join(projectRoot, "frontend", "dist", "index.html"));
            if (await indexHtml.exists()) {
              return new Response(indexHtml);
            }
          }

          return new Response("Not found", { status: 404 });
        }
      });
      addLog("HTTP Operator Dashboard API running on http://localhost:4000");
      addLog("Dashboard UI available at http://localhost:4000/");
    } catch (e: any) {
      addLog(`HTTP server failed to start (port may be in use): ${e.message}`);
    }
  }
}

main().catch(console.error);
