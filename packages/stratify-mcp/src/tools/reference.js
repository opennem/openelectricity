import { CHART_TYPES, DISPLAY_MODES, DATA_TRANSFORMS, CATEGORY_SORTS, LINE_STYLES } from '../schema/chart-types.js';
import { COLOUR_PALETTES } from '../schema/palettes.js';

/**
 * Register reference tools on the MCP server.
 * @param {import('@modelcontextprotocol/sdk/server/index.js').Server} server
 */
export function registerReferenceTools(server) {
	server.setRequestHandler(
		/** @type {any} */ ({ method: 'tools/call' }),
		async (/** @type {any} */ request) => {
			// Handled in the main router — this is just for organisation
			return null;
		}
	);
}

/** @returns {any[]} Tool definitions for reference tools */
export function getReferenceToolDefinitions() {
	return [
		{
			name: 'list_chart_types',
			description: 'List all available Stratify chart types with descriptions.',
			inputSchema: { type: 'object', properties: {} }
		},
		{
			name: 'list_colour_palettes',
			description: 'List all available colour palettes grouped by category (qualitative, sequential, diverging).',
			inputSchema: { type: 'object', properties: {} }
		},
		{
			name: 'list_style_presets',
			description: 'List available typography/style presets.',
			inputSchema: { type: 'object', properties: {} }
		},
		{
			name: 'list_line_styles',
			description: 'List available line styles for per-series line chart customisation.',
			inputSchema: { type: 'object', properties: {} }
		}
	];
}

/**
 * Handle a reference tool call.
 * @param {string} name
 * @returns {{ content: any[] } | null}
 */
export function handleReferenceTool(name) {
	switch (name) {
		case 'list_chart_types':
			return {
				content: [{
					type: 'text',
					text: JSON.stringify({
						chartTypes: CHART_TYPES,
						displayModes: DISPLAY_MODES,
						dataTransforms: DATA_TRANSFORMS,
						categorySorts: CATEGORY_SORTS
					}, null, 2)
				}]
			};

		case 'list_colour_palettes':
			return {
				content: [{
					type: 'text',
					text: JSON.stringify({
						palettes: COLOUR_PALETTES,
						default: 'oe-energy',
						note: 'Qualitative palettes are best for categorical data. Sequential for ordered numeric. Diverging for data with a meaningful midpoint.'
					}, null, 2)
				}]
			};

		case 'list_style_presets':
			return {
				content: [{
					type: 'text',
					text: JSON.stringify({
						presets: [
							{ id: 'sans', name: 'Sans', description: 'Clean sans-serif (DM Sans). Default.' },
							{ id: 'mono', name: 'Mono', description: 'Technical monospace (DM Mono).' }
						],
						default: 'sans'
					}, null, 2)
				}]
			};

		case 'list_line_styles':
			return {
				content: [{
					type: 'text',
					text: JSON.stringify({
						lineStyles: LINE_STYLES,
						default: 'solid',
						note: 'Line styles apply per-series on line charts. Set via seriesLineStyles: { "series_key": "dashed" }'
					}, null, 2)
				}]
			};

		default:
			return null;
	}
}
