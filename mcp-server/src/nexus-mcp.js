/**
 * @file nexus-mcp.js
 * @description This script implements an MCP server named "nexus-mcp" which acts as a bridge (nexus) to aggregate and manage multiple downstream MCP servers.
 * It provides a unified interface to discover tools, retrieve input schemas, and execute functions across all connected MCP servers defined in the configuration.
 * @author Kanshi Tanaike
 * @repository https://github.com/tanaikech/nexus-mcp-extension
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { nexus } from "./nexus-connector.js";

const MCP_SERVER_NAME = "nexus-mcp";
const MCP_SERVER_VERSION = "0.0.1";

const server = new McpServer({
  name: MCP_SERVER_NAME,
  version: MCP_SERVER_VERSION,
});

/**
 * Tool Definitions
 * Note: inputSchema definitions are preserved exactly as provided.
 */
const tools = [
  {
    name: "get-server-information",
    schema: {
      description: "Use this to show the information of this MCP server.",
      inputSchema: {},
    },
    func: async (object = {}) => await nexus.getInf(),
  },
  {
    name: "list-tools",
    schema: {
      description: "Use this to show all tool lists.",
      inputSchema: {},
    },
    func: async (object = {}) => await nexus.getTools(),
  },
  {
    name: "get-input-schema-for-tools",
    schema: {
      description: "Use this to show the input schema of the specific tools.",
      inputSchema: {
        servers: z
          .array(
            z
              .object({
                server_name: z.string().describe("Server name"),
                tool_names: z
                  .array(
                    z
                      .string()
                      .describe(
                        "Tool name. The input schema to the tool will be returned."
                      )
                  )
                  .describe("Tool names."),
              })
              .describe(
                "An object including the server name and tool names for the server."
              )
          )
          .describe(
            "An array including the server names and tool names for each server."
          ),
      },
    },
    func: async (object = {}) => await nexus.getSchemas(object),
  },
  {
    name: "call-tool",
    schema: {
      description:
        "Use this to call a tool and run the script of the tool. Use this only when you already know the server name, tool name, and the input schema of the tool.",
      inputSchema: {
        server_name: z.string().describe("Server name"),
        tool_name: z.string().describe("Tool name"),
        args: z
          .object({})
          .catchall(z.unknown())
          .describe(
            "Arguments for the tool. You can confirm the input schema for the arguments of each tool using a tool `get-input-schema-for-tools`. If no arguments are required to be used, provide just `{}`."
          ),
      },
    },
    func: async (object = {}) => await nexus.callTool(object),
  },
];

// Register tools
for (const { name, schema, func } of tools) {
  server.registerTool(name, schema, func);
}

// Start Server
async function main() {
  // Initialize connections to downstream servers
  await nexus.connectAll();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`${MCP_SERVER_NAME} v${MCP_SERVER_VERSION} running on stdio`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
