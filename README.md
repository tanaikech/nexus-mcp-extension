# Nexus-MCP: A Unified Gateway for Scalable MCP Server Aggregation

![](images/fig1.jpg)

# Abstract

Nexus-MCP addresses "Tool Space Interference" in Large Language Models by acting as a unified gateway for multiple MCP servers. By dynamically routing tool requests and filtering context, it enables the use of massive tool ecosystems without sacrificing reasoning accuracy or exhausting context windows, ensuring scalable and deterministic agentic workflows.

# Introduction

While the integration of Gemini CLI and Google Antigravity with the Model Context Protocol (MCP) significantly expands the operational capabilities of LLM-based agents, it introduces a critical performance trade-off. As the number of available tools increases, Large Language Models (LLMs) experience a measurable decline in reasoning accuracy and tool-selection reliability.

Research indicates that saturating the context window with tool definitions leads to "Tool Space Interference (TSI)," where semantic overlap and irrelevant metadata distract the model [Ref](https://www.microsoft.com/en-us/research/blog/tool-space-interference-in-the-mcp-era-designing-for-agent-compatibility-at-scale/). Current technical guidelines suggest a "soft limit" of approximately 20 functions to maintain high accuracy; exceeding this threshold often results in increased hallucination rates or failures in following complex instructions.

The standard MCP workflow typically operates as follows:

1. **Metadata Retrieval:** The MCP Client connects to the Server to retrieve names, descriptions, and JSON Schemas.
2. **Context Injection:** This metadata is injected into the LLM's context window as 'Available Tool Definitions.'
3. **Selection:** The AI performs a cross-entropy-based decision process to select and parameterize a Tool Call.

**Nexus-MCP** addresses the scalability limits of this architecture by acting as an intelligent, unified gateway. Rather than exposing the entire toolset to the LLM—which triggers TSI and exhausts context—Nexus-MCP aggregates multiple MCP servers and employs a routing layer. This presents only the subset of tools contextually relevant to the specific user prompt. This modular approach preserves model performance by minimizing noise and optimizing information density, enabling the use of high-scale tool ecosystems without sacrificing precision.

# Architecture and Workflow

![](images/fig1b.jpg)

[Mermaid Chart Playground](https://mermaidchart.com/play?utm_source=mermaid_live_editor&utm_medium=share#pako:eNqNVMtu2zAQ_BWCpwS1DD8jW4cARtICOTQw6vRS-MJQa5koRap8BHaN_HuXpPxI6rjVQc-Z2dnhUjvKdQm0oBZ-eVAc7gWrDKuXiuDBvNPK189g0nPDjBNcNEw58t2eezurAM_MktlDuv8b8ggbbwMk3mRf7-ZkAeYlqCVwUM5ubyO9IA-q8Y7Mja6bViydH7UDopGW6nSSXEEWDhoyKMiT1pLcC8sDZps4EYnSLVQK6zKHONtKRkPH0t_AeaNIQETshfJt3WFbdwESuBNanVKYxOY1sV449iwh6lqy0l6VCXC0iB5CCgVZ0qc1EO6NCbkmBmdKaQyZrwW8oAwCKs1kd0mTDEgL0YYlokSaWAk4qXAxuBFe-RpqFpo3qM_ke2-H-CpwmQirk9lIyVbapDjJ1cxuFb8-KXoh2sS2R_CHXluT44J83gD3IWAylxiHUNV_0N-2etOu1UHqyJNaN7iGYUc4wc5CzuTBmZSxf3LlLTpqG7t-S3qfRPSgvcMcj0A4HYl_xZGHOK3H6VpsFU6DFfbDefoiFPZjEvzTSYwNxkhKcEzsdwN6oB1aGVHSwhkPHVqDqVl4pLsAWVIsVsOShjEtmfkZBvAVObjNf2hd72lG-2pNixXDuexQ35TM7X8zh7c43iWYO9wLjhb94TSK0GJHN7SYTLs3k3Gvnw8meW8wHPQ7dEuL4aA7yUfTcZ5P-tO8NxqNXjv0dyzbwy_j1z-ZCYk6)

The Nexus-MCP workflow employs a **"Defensive and Deterministic"** architecture. It prioritizes operational reliability and schema-strictness over raw execution speed, effectively eliminating "hallucinated tool calls" through a mandatory multi-stage validation process.

1. **User Input:** The process begins when the user submits a specific prompt or objective.
2. **Tool Discovery:** The agent invokes `list-tools` to identify available server functionalities via the gateway.
3. **Tool Selection:** The agent selects necessary tools or terminates if capabilities are insufficient.
4. **Schema Retrieval:** Detailed input schemas for selected tools are retrieved asynchronously to ensure technical compliance.
5. **Execution Planning:** A logical, sequential plan is developed to execute tools in the optimal order.
6. **Tool Execution:** Tools are called sequentially via `call-tool` using validated schemas.
7. **Result Synthesis:** Final outputs are consolidated into a response, including the detailed execution plan.

# Prerequisites and Installation

This guide uses **Gemini CLI** and **Google Antigravity** to demonstrate the capabilities of Nexus-MCP.

## 1. Environment Setup

**Install Gemini CLI**

First, install the [Gemini CLI](https://github.com/google-gemini/gemini-cli) via npm:

```bash
npm install -g @google/gemini-cli
```

Authorize the CLI by following the instructions in the [official documentation](https://github.com/google-gemini/gemini-cli?tab=readme-ov-file#-authentication-options).

**Install Google Antigravity**

Please refer to the official release and installation guide at [https://antigravity.google/](https://antigravity.google/).

## 2. Install Nexus-MCP Extension

Install the Nexus-MCP extension directly via the Gemini CLI:

```bash
gemini extensions install https://github.com/tanaikech/nexus-mcp-extension
```

## 3. Install and Configure Sample MCP Servers

To demonstrate aggregation, we will install two specific extensions: **Google Workspace** and **ToolsForMCPServer**.

_Important Note: We will install these extensions to download their source code and authenticate them. However, they must be disabled in the Gemini CLI after testing. This ensures that Nexus-MCP manages them exclusively, preventing duplicate tool definitions in the LLM context._

**A. Google Workspace Extension**

1. Install the extension:

```bash
gemini extensions install https://github.com/gemini-cli-extensions/workspace
```

2. Launch the Gemini CLI to trigger the automatic authorization flow.
3. Run the following prompt in Gemini CLI to ensure it works:

```text
Get the current date and time.
```

4. Once verified, **disable** the extension:

```bash
gemini extensions disable google-workspace
```

**B. ToolsForMCPServer Extension**

1. Install [ToolsForMCPServer-extension](https://github.com/tanaikech/ToolsForMCPServer-extension). Refer to the [installation guide](https://github.com/tanaikech/ToolsForMCPServer-extension?tab=readme-ov-file#how-to-install-toolsformcpserver-extension) for details.
2. Launch Gemini CLI and run the verification prompt:

```text
Get the current date and time.
```

3. Once verified, **disable** the extension:

```bash
gemini extensions disable tools-for-mcp-server-extension
```

## 4. Configuration

To aggregate these disabled extensions under Nexus-MCP, you must create a configuration file.

**Create mcp_config.json**

Identify the installation paths of your extensions using `gemini extensions list`. Typical paths are located in `/home/{username}/.gemini/extensions/...`.

Create the JSON file (e.g., in your home directory) with the following content. **Replace `{username}` with your actual username.**

```json
{
  "mcpServers": {
    "google-workspace": {
      "command": "node",
      "args": [
        "/home/{username}/.gemini/extensions/google-workspace/dist/index.js"
      ]
    },
    "tools-for-mcp-server-extension": {
      "command": "node",
      "args": [
        "/home/{username}/.gemini/extensions/tools-for-mcp-server-extension/mcp-server/src/tools-for-mcp-server-extension.js"
      ],
      "timeout": 300000
    }
  }
}
```

**Set Environment Variable**

Point Nexus-MCP to this configuration file. Replace `{your path}` with the full path to the file you just created.

```bash
export MCP_SERVER_LIST="{your path}/mcp_config.json"
```

**Verify Configuration**

Run `gemini extensions list`. You should see `nexus-mcp-extension` enabled, while the other two are disabled (marked with `✗`).

```text
$ gemini extensions list
✗ google-workspace (v0.0.3)
 ...
 Enabled (User): false
 ...
✓ nexus-mcp-extension (0.0.1)
 ...
 Enabled (User): true
 ...
✗ tools-for-mcp-server-extension (1.2.0)
 ...
 Enabled (User): false
 ...
```

# Validation and Testing

## Part 1: Testing with Gemini CLI

Launch the Gemini CLI. You can confirm the connection status by running the `/mcp` command.

![](images/fig2a.jpg)

To verify which tools Nexus-MCP has aggregated, use the prompt: `run a tool get-server-information`.

![](images/fig2b.jpg)

In this example, the system successfully identifies 46 tools from `google-workspace` and 160 tools from `tools-for-mcp-server-extension`. In this sample case, the total number of tools is 206.

**Case Study 1: Weather Information**

Prompt:

```text
What is the weather forecast for Tokyo at noon today?
```

![](images/fig2c.jpg)

Result: The agent identifies and utilizes 2 specific tools from `tools-for-mcp-server-extension` to fulfill the request.

**Case Study 2: Calendar Management (Routing Control)**

Since Google Calendar functionality exists in both extensions, you can direct the agent to use a specific backend.

Option A: Using Google Workspace

```text
Show me today's schedule. Use google-workspace.
```

![](images/fig2d.jpg)

Option B: Using ToolsForMCPServer

```text
Show me today's schedule. Use tools-for-mcp-server-extension.
```

![](images/fig2e.jpg)

**Case Study 3: Complex Multi-Tool Workflows**

Nexus-MCP truly shines when handling complex instructions that require tools from multiple sources.

Prompt:

```text
Write a comprehensive article about developing Google Apps Script (GAS) using generative AI. The article should include an introductory overview, formatted lists for best practices, and a table comparing different AI-assisted coding techniques. Once generated, please create a new Google Document, insert the content, and provide the shareable URL.
```

![](images/fig2f.jpg)

Result: The agent coordinated 3 different tools across both aggregated servers to generate the content and create the document.

![](images/fig2g.jpg)

## Part 2: Testing with Google Antigravity

Nexus-MCP can also be integrated into Google Antigravity for advanced agentic workflows.

**1. Set Rules**

Launch Antigravity. Click the three dots (top right) and select **Customizations**. In the **Rules** section, paste the content of the `GEMINI.md` file included with the extension.

Command to read the file:

```bash
cat /home/{username}/.gemini/extensions/nexus-mcp-extension/GEMINI.md
```

**2. Configure MCP Server**

Click the three dots (top right) > **MCP servers** > **Manage MCP servers**. Select **View raw config**. Paste the following configuration (replace `{username}` with yours):

```json
{
  "mcpServers": {
    "nexus-mcp": {
      "command": "node",
      "args": [
        "/home/{username}/.gemini/extensions/nexus-mcp-extension/mcp-server/src/nexus-mcp.js"
      ]
    }
  }
}
```

Click **Refresh**. You should see the connected Nexus-MCP server.

![](images/fig3a.jpg)

**Case Study 1: Weather Information**

Prompt:

```text
What is the weather forecast for Tokyo at noon today?
```

![](images/fig3b.jpg)

Walkthrough: The agent correctly identifies the weather tool and processes the request.

![](images/fig3c.jpg)

**Case Study 2: Complex Workflow**

Scenario: A multi-step task involving content generation, document creation, PDF conversion, and email delivery.

Prompt:

```text
Write a comprehensive article about developing Google Apps Script (GAS) using generative AI. The article should include an introductory overview, formatted lists for best practices, and a table comparing different AI-assisted coding techniques. Once generated, please create a new Google Document, insert the content, convert the Google Document to a PDF file, and send an email to `tanaike@hotmail.com` including the shareable URL of the PDF file by giving a suitable title and email body.
```

![](images/fig3d.jpg)

**Implementation Plan:** Antigravity analyzes the request and builds a step-by-step plan.

![](images/fig3e.jpg)

**Walkthrough:** The agent executes the plan sequentially.

![](images/fig3f.jpg)

**Outcome:** The email was successfully received with the correct metadata and attachment link.

```text
# Title
Comprehensive Article: Developing GAS with Generative AI

# Body
Hello,

I have completed the article on developing Google Apps Script (GAS)
using Generative AI.
...
```

The generated PDF confirms the content integrity.

![](images/fig3g.jpg)

# Summary

Nexus-MCP represents a significant advancement in managing large-scale tool ecosystems for LLMs. By abstracting the complexity of multiple servers behind a single gateway, it ensures that agents remain accurate and efficient even as their capabilities grow.

- **Solves Tool Space Interference (TSI):** Prevents context window saturation by filtering irrelevant tool definitions.
- **Unified Gateway Architecture:** Aggregates multiple MCP servers into a single access point, simplifying client configuration.
- **Defensive & Deterministic:** Prioritizes strict schema validation and logical planning to eliminate tool hallucinations.
- **Cross-Platform Compatibility:** Works seamlessly with both Gemini CLI and Google Antigravity.
- **Complex Workflow Enablement:** Successfully coordinates multi-step tasks (e.g., create doc -> convert PDF -> email) across different tool providers.
