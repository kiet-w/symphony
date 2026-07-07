import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
// Initialize the Symphony MCP Server
const server = new Server({
    name: "symphony-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Define our 4 core tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "claim_ticket",
                description: "Agent claims a ticket to start working on it.",
                inputSchema: {
                    type: "object",
                    properties: {
                        ticketId: { type: "string", description: "Issue/Ticket ID (e.g. SYM-42)" },
                        agentId: { type: "string", description: "Name or ID of the agent claiming the task" }
                    },
                    required: ["ticketId", "agentId"],
                },
            },
            {
                name: "set_status",
                description: "Update the status of a ticket on the GitHub Project Board.",
                inputSchema: {
                    type: "object",
                    properties: {
                        ticketId: { type: "string", description: "Issue/Ticket ID" },
                        status: { type: "string", enum: ["Todo", "In Progress", "In Review", "Done"], description: "The target column/status" }
                    },
                    required: ["ticketId", "status"],
                },
            },
            {
                name: "post_signal",
                description: "Post a compact low-token signal to the GitHub issue (e.g. blocked, done).",
                inputSchema: {
                    type: "object",
                    properties: {
                        ticketId: { type: "string", description: "Issue/Ticket ID" },
                        payload: { type: "string", description: "Compact signal payload, e.g. 'agent=codex|status=blocked|reason=missing_api'" }
                    },
                    required: ["ticketId", "payload"],
                },
            },
            {
                name: "get_board",
                description: "Read the current status of all tickets from the GitHub Project.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            }
        ],
    };
});
// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "claim_ticket": {
                const { ticketId, agentId } = args;
                // Ponytail MVP: Log to stdout, later implement Octokit GraphQL to assign user & change label
                console.error(`[Symphony] Agent ${agentId} claimed ticket ${ticketId}`);
                return {
                    content: [{ type: "text", text: `Successfully claimed ticket ${ticketId} for agent ${agentId}.` }]
                };
            }
            case "set_status": {
                const { ticketId, status } = args;
                // Ponytail MVP: Mocking GraphQL call to GitHub Project v2 updateProjectV2ItemFieldValue
                console.error(`[Symphony] Ticket ${ticketId} moved to ${status}`);
                return {
                    content: [{ type: "text", text: `Status for ${ticketId} updated to ${status}.` }]
                };
            }
            case "post_signal": {
                const { ticketId, payload } = args;
                // Ponytail MVP: Mocking GitHub issue comment creation
                console.error(`[Symphony] SIGNAL on ${ticketId}: ${payload}`);
                return {
                    content: [{ type: "text", text: `Signal posted to ${ticketId} successfully.` }]
                };
            }
            case "get_board": {
                // Ponytail MVP: Mocking GraphQL call to fetch project items
                const mockBoard = [
                    { ticket: "SYM-1", status: "Todo", assignee: null },
                    { ticket: "SYM-2", status: "In Progress", assignee: "Claude" }
                ];
                return {
                    content: [{ type: "text", text: JSON.stringify(mockBoard, null, 2) }]
                };
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
        };
    }
});
// Boot the server via STDIO
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Symphony MCP Server running on stdio");
}
main().catch(console.error);
