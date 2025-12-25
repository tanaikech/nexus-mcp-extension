import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "fs";
import "dotenv/config";

const MCP_CLIENT_NAME = "nexus-mcp-client";
const MCP_CLIENT_VERSION = "0.0.1";
const MCP_SERVER_LIST = process.env.MCP_SERVER_LIST || "";

class NexusConnector {
  constructor() {
    this.connections = new Map(); // key: serverName, value: { client, transport, info }
    this.isInitialized = false;
  }

  /**
   * Parses the server configuration file.
   */
  _loadConfig() {
    if (!MCP_SERVER_LIST || !fs.existsSync(MCP_SERVER_LIST)) {
      throw new Error(
        "Error: Provide the file path of the file, including the information of MCP servers using an environment variable 'MCP_SERVER_LIST'."
      );
    }

    try {
      const fileContent = fs.readFileSync(MCP_SERVER_LIST, "utf8");
      const obj = JSON.parse(fileContent);

      if (!obj.mcpServers) {
        throw new Error(
          "Error: Invalid JSON for MCP servers (missing mcpServers key)."
        );
      }

      return Object.entries(obj.mcpServers).map(([k, v]) => ({
        name: k,
        config: v,
      }));
    } catch (err) {
      throw new Error(`Configuration Error: ${err.message}`);
    }
  }

  /**
   * Establishes connections to all downstream servers defined in the config.
   * This is called once at startup.
   */
  async connectAll() {
    if (this.isInitialized) return;

    let serverConfigs;
    try {
      serverConfigs = this._loadConfig();
    } catch (err) {
      console.error(err.message);
      return; // Start empty if config fails, allows server to at least run.
    }

    for (const { name, config } of serverConfigs) {
      try {
        const transport = new StdioClientTransport({
          command: config.command,
          args: config.args || [],
          env: { ...process.env, ...(config.env || {}) },
        });

        const client = new Client(
          { name: MCP_CLIENT_NAME, version: MCP_CLIENT_VERSION },
          { capabilities: {} }
        );

        await client.connect(transport);

        // Store connection details
        this.connections.set(name, {
          client,
          transport,
          info: {
            name: name,
            version: client.getServerVersion()?.version || "unknown",
          },
        });
      } catch (err) {
        console.error(
          `Failed to connect to downstream server '${name}': ${err.message}`
        );
      }
    }
    this.isInitialized = true;
  }

  async getInf() {
    const len = this.connections.size;
    const res = [
      `Currently, you can use the following tools of ${len} server${
        len > 1 ? "s" : ""
      }.`,
    ];

    for (const [name, conn] of this.connections) {
      try {
        const list = await conn.client.listTools();
        res.push(
          `Server name: ${name} (v${conn.info.version}) Total tools: ${list.tools.length}`
        );
      } catch (err) {
        res.push(
          `Server name: ${name} - Error fetching details: ${err.message}`
        );
      }
    }

    return {
      content: [{ type: "text", text: res.join("\n") }],
      isError: false,
    };
  }

  async getTools() {
    const toolsOutput = [];
    const len = this.connections.size;

    toolsOutput.push("==================================================");
    toolsOutput.push(`MCP SERVER INVENTORY (Total Servers: ${len})`);
    toolsOutput.push("==================================================");
    toolsOutput.push(
      "Directives: Use the EXACT string in [SERVER_ID] and [TOOL_ID].\n"
    );

    for (const [name, conn] of this.connections) {
      try {
        const list = await conn.client.listTools();
        toolsOutput.push(
          `[SERVER_ID: ${name}] (Version: v${conn.info.version})`
        );
        const toolDescriptions = list.tools.map(
          ({ name: tName, description }) => {
            const cleanDesc = (description || "").replace(/\n/g, " ");
            return `- [TOOL_ID: ${tName}] | DESC: ${cleanDesc}`;
          }
        );
        toolsOutput.push(toolDescriptions.join("\n"), "");
      } catch (err) {
        toolsOutput.push(
          `[SERVER_ID: ${name}] | Error fetching details: ${err.message}\n`
        );
      }
    }
    toolsOutput.push("==================================================");
    toolsOutput.push("💡 SEARCH HINTS FOR COMPLEX TASKS:");
    toolsOutput.push(
      "- PDF Generation: Search for 'convert' or 'mimeType' (Target: 'application/pdf')."
    );
    toolsOutput.push(
      "- Markdown to Doc: Search for 'markdown' in descriptions."
    );
    toolsOutput.push(
      "- Shareable URL: You MUST change 'permission' or 'share' to 'public' or 'anyone' BEFORE sharing."
    );
    toolsOutput.push(
      "- Google Apps Script (GAS): Search for 'explanation_reference_generate_google_apps_script' or 'gas'."
    );
    toolsOutput.push("==================================================");

    return {
      content: [{ type: "text", text: toolsOutput.join("\n") }],
      isError: false,
    };
  }

  async getSchemas(object = {}) {
    const { servers = [] } = object;

    if (servers.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Provide the server names and tool names for each server.",
          },
        ],
        isError: true,
      };
    }

    const res = [];

    // Create a map of ServerName -> ToolName -> Schema for requested servers
    for (const req of servers) {
      const conn = this.connections.get(req.server_name);

      if (!conn) {
        // Skip unknown servers
        continue;
      }

      try {
        const list = await conn.client.listTools();
        const toolsMap = new Map(
          list.tools.map((t) => [t.name, t.inputSchema])
        );

        for (const toolName of req.tool_names) {
          const schema = toolsMap.get(toolName);
          if (schema) {
            res.push(
              `# Server name: ${req.server_name}, Tool name: ${toolName}\n` +
                `\`\`\`\`json\n${JSON.stringify(schema)}\n\`\`\`\`` // or `\`\`\`\`json\n${JSON.stringify(schema, null, 2)}\n\`\`\`\``
            );
          }
        }
      } catch (err) {
        // Handle individual server errors gracefully
        res.push(
          `Error fetching schemas from ${req.server_name}: ${err.message}`
        );
      }
    }

    return {
      content: [{ type: "text", text: res.join("\n") }],
      isError: false,
    };
  }

  async callTool(object = {}) {
    const { server_name, tool_name, args = {} } = object;

    if (!server_name || !tool_name) {
      return {
        content: [
          {
            type: "text",
            text: "Provide the server name, tool name, and arguments for the tool.",
          },
        ],
        isError: true,
      };
    }

    const conn = this.connections.get(server_name);

    if (!conn) {
      return {
        content: [
          {
            type: "text",
            text: `Provide server name (${server_name}) was not found.`,
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await conn.client.callTool({
        name: tool_name,
        arguments: args,
      });
      return result;
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error calling tool: ${err.message}` }],
        isError: true,
      };
    }
  }
}

// Export a singleton instance
export const nexus = new NexusConnector();
