import { StratifyApiClient } from '../api-client.js';

/** @returns {any[]} Tool definitions for API tools */
export function getApiToolDefinitions() {
	return [
		{
			name: 'save_chart',
			description: 'Save a chart config to Stratify via the API. Requires STRATIFY_API_URL and STRATIFY_AUTH_TOKEN environment variables. Returns the chart ID and preview URL.',
			inputSchema: {
				type: 'object',
				properties: {
					config: {
						type: 'object',
						description: 'Complete chart configuration (output from create_chart_config)'
					}
				},
				required: ['config']
			}
		},
		{
			name: 'update_chart',
			description: 'Update an existing chart. Only send fields that need changing.',
			inputSchema: {
				type: 'object',
				properties: {
					id: { type: 'string', description: 'Chart ID' },
					fields: { type: 'object', description: 'Fields to update' }
				},
				required: ['id', 'fields']
			}
		},
		{
			name: 'get_chart',
			description: 'Fetch a chart by ID from Stratify.',
			inputSchema: {
				type: 'object',
				properties: {
					id: { type: 'string', description: 'Chart ID' }
				},
				required: ['id']
			}
		},
		{
			name: 'list_charts',
			description: 'List your Stratify charts, optionally filtered by status.',
			inputSchema: {
				type: 'object',
				properties: {
					status: {
						type: 'string',
						enum: ['draft', 'published'],
						description: 'Filter by status'
					}
				}
			}
		},
		{
			name: 'fork_chart',
			description: 'Fork a published chart to create your own copy.',
			inputSchema: {
				type: 'object',
				properties: {
					id: { type: 'string', description: 'Chart ID to fork' }
				},
				required: ['id']
			}
		}
	];
}

/**
 * Handle an API tool call.
 * @param {string} name
 * @param {Record<string, any>} args
 * @param {StratifyApiClient | null} client
 * @param {string} baseUrl
 * @returns {Promise<{ content: any[] } | null>}
 */
export async function handleApiTool(name, args, client, baseUrl) {
	if (!client) {
		return {
			content: [{
				type: 'text',
				text: JSON.stringify({
					error: 'API access not configured. Set STRATIFY_API_URL and STRATIFY_AUTH_TOKEN environment variables.',
					hint: 'You can still use create_chart_config to generate configs for manual import.'
				})
			}],
			isError: true
		};
	}

	try {
		switch (name) {
			case 'save_chart': {
				const result = await client.createChart(args.config);
				const chartId = result.chart?._id;
				return {
					content: [{
						type: 'text',
						text: JSON.stringify({
							success: true,
							chartId,
							previewUrl: chartId ? `${baseUrl}/strata/${chartId}` : null,
							editUrl: chartId ? `${baseUrl}/stratify/${chartId}` : null
						}, null, 2)
					}]
				};
			}

			case 'update_chart': {
				const result = await client.updateChart(args.id, args.fields);
				return {
					content: [{
						type: 'text',
						text: JSON.stringify({ success: true, chartId: result.chart?._id }, null, 2)
					}]
				};
			}

			case 'get_chart': {
				const result = await client.getChart(args.id);
				return {
					content: [{
						type: 'text',
						text: JSON.stringify(result.chart, null, 2)
					}]
				};
			}

			case 'list_charts': {
				const result = await client.listCharts(args.status);
				return {
					content: [{
						type: 'text',
						text: JSON.stringify({
							myCharts: (result.myCharts || []).map((/** @type {any} */ c) => ({
								id: c._id,
								title: c.title,
								status: c.status,
								chartType: c.chartType,
								updatedAt: c._updatedAt
							})),
							communityCharts: (result.communityCharts || []).map((/** @type {any} */ c) => ({
								id: c._id,
								title: c.title,
								chartType: c.chartType,
								userEmail: c.userEmail
							}))
						}, null, 2)
					}]
				};
			}

			case 'fork_chart': {
				const result = await client.forkChart(args.id);
				const chartId = result.chart?._id;
				return {
					content: [{
						type: 'text',
						text: JSON.stringify({
							success: true,
							chartId,
							editUrl: chartId ? `${baseUrl}/stratify/${chartId}` : null
						}, null, 2)
					}]
				};
			}

			default:
				return null;
		}
	} catch (err) {
		return {
			content: [{
				type: 'text',
				text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) })
			}],
			isError: true
		};
	}
}
