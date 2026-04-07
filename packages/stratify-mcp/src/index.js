import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { getChartConfigToolDefinitions, handleChartConfigTool } from './tools/chart-config.js';
import { getReferenceToolDefinitions, handleReferenceTool } from './tools/reference.js';
import { getApiToolDefinitions, handleApiTool } from './tools/chart-api.js';
import { StratifyApiClient } from './api-client.js';

export function startServer() {
	const apiUrl = process.env.STRATIFY_API_URL || '';
	const authToken = process.env.STRATIFY_AUTH_TOKEN || '';
	const hasApi = !!(apiUrl && authToken);

	/** @type {StratifyApiClient | null} */
	const apiClient = hasApi ? new StratifyApiClient(apiUrl, authToken) : null;

	const server = new Server(
		{ name: 'stratify-mcp', version: '0.1.0' },
		{ capabilities: { tools: {} } }
	);

	// List tools
	server.setRequestHandler(ListToolsRequestSchema, async () => {
		const tools = [
			...getChartConfigToolDefinitions(),
			...getReferenceToolDefinitions(),
			...(hasApi ? getApiToolDefinitions() : [])
		];
		return { tools };
	});

	// Handle tool calls
	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name, arguments: args = {} } = request.params;

		// Chart config tools (offline)
		const configResult = handleChartConfigTool(name, args);
		if (configResult) return configResult;

		// Reference tools (offline)
		const refResult = handleReferenceTool(name);
		if (refResult) return refResult;

		// API tools (online)
		const apiResult = await handleApiTool(name, args, apiClient, apiUrl);
		if (apiResult) return apiResult;

		return {
			content: [{ type: 'text', text: `Unknown tool: ${name}` }],
			isError: true
		};
	});

	const transport = new StdioServerTransport();
	server.connect(transport);

	if (!hasApi) {
		process.stderr.write(
			'[stratify-mcp] Running in offline mode. Set STRATIFY_API_URL and STRATIFY_AUTH_TOKEN for API access.\n'
		);
	}
}
