import { buildSnapshot, validateSnapshot } from '../schema/snapshot.js';
import { CHART_TYPE_VALUES, LINE_STYLE_VALUES } from '../schema/chart-types.js';
import { PALETTE_IDS } from '../schema/palettes.js';

/** @returns {any[]} Tool definitions for chart config tools */
export function getChartConfigToolDefinitions() {
	return [
		{
			name: 'create_chart_config',
			description: `Create a complete Stratify chart configuration from CSV data and options.
Returns a JSON config that can be imported into Stratify via the "Import JSON" button,
or saved directly via the save_chart tool (if API access is configured).

CSV format: first column is the x-axis (dates, categories, or numbers), remaining columns are data series.
The delimiter is auto-detected (tab, comma, or semicolon).

Chart types: ${CHART_TYPE_VALUES.join(', ')}
Colour palettes: ${PALETTE_IDS.join(', ')} (default: oe-energy)
Display modes: auto (default), time-series, category, linear
Style presets: sans (default), mono`,
			inputSchema: {
				type: 'object',
				properties: {
					csvData: {
						type: 'string',
						description: 'CSV or TSV data. First column = x-axis, remaining columns = data series. Include a header row.'
					},
					chartType: {
						type: 'string',
						enum: CHART_TYPE_VALUES,
						description: 'Chart type. Default: line'
					},
					title: { type: 'string', description: 'Chart title' },
					description: { type: 'string', description: 'Chart description/subtitle' },
					dataSource: { type: 'string', description: 'Data source attribution' },
					notes: { type: 'string', description: 'Additional notes' },
					displayMode: {
						type: 'string',
						enum: ['auto', 'time-series', 'category', 'linear'],
						description: 'X-axis type. Auto-detects if not specified.'
					},
					colourPalette: {
						type: 'string',
						enum: PALETTE_IDS,
						description: 'Colour palette ID. Default: oe-energy'
					},
					stylePreset: {
						type: 'string',
						enum: ['sans', 'mono'],
						description: 'Typography preset. Default: sans'
					},
					dataTransform: {
						type: 'string',
						enum: ['none', 'cumulative'],
						description: 'Data transform. Default: none'
					},
					xLabel: { type: 'string', description: 'X-axis label' },
					yLabel: { type: 'string', description: 'Y-axis label' },
					y2Label: { type: 'string', description: 'Right Y-axis label' },
					chartHeight: {
						type: 'number',
						description: 'Chart height in pixels (100-1200). Default: 400'
					},
					hiddenSeries: {
						type: 'array',
						items: { type: 'string' },
						description: 'Series keys to hide. Keys are lowercase header names with spaces/special chars replaced by underscores.'
					},
					userSeriesColours: {
						type: 'object',
						description: 'Override colours per series: { "series_key": "#hexcolor" }'
					},
					userSeriesLabels: {
						type: 'object',
						description: 'Override display labels per series: { "series_key": "Custom Label" }'
					},
					seriesYAxis: {
						type: 'object',
						description: 'Assign series to left/right Y-axis: { "series_key": "right" }'
					},
					seriesLineStyles: {
						type: 'object',
						description: `Per-series line style overrides (line charts only): { "series_key": "dashed" }. Valid styles: ${LINE_STYLE_VALUES.join(', ')}`
					},
					xTicks: { type: 'number', description: 'Number of x-axis ticks (0 = auto)' },
					yTicks: { type: 'number', description: 'Number of y-axis ticks (0 = auto)' },
					xTickRotate: { type: 'number', description: 'X-axis label rotation in degrees (-90 to 90)' },
					marginBottom: { type: 'number', description: 'Bottom margin for x-axis labels (0 = auto)' },
					marginLeft: { type: 'number', description: 'Left margin for y-axis labels (0 = auto)' },
					categorySort: {
						type: 'string',
						enum: ['default', 'x-asc', 'x-desc', 'value-asc', 'value-desc'],
						description: 'Sort order for category data'
					},
					showBranding: { type: 'boolean', description: 'Show Open Electricity branding. Default: true' }
				},
				required: ['csvData']
			}
		},
		{
			name: 'validate_chart_config',
			description: 'Validate a Stratify chart configuration and return any errors or warnings.',
			inputSchema: {
				type: 'object',
				properties: {
					config: {
						type: 'object',
						description: 'The chart configuration object to validate'
					}
				},
				required: ['config']
			}
		}
	];
}

/**
 * Handle a chart config tool call.
 * @param {string} name
 * @param {Record<string, any>} args
 * @returns {{ content: any[] } | null}
 */
export function handleChartConfigTool(name, args) {
	switch (name) {
		case 'create_chart_config': {
			const { csvData, ...options } = args;
			if (!csvData) {
				return {
					content: [{ type: 'text', text: JSON.stringify({ error: 'csvData is required' }) }],
					isError: true
				};
			}

			const config = buildSnapshot({
				csvText: csvData,
				...options
			});

			const validation = validateSnapshot(config);

			return {
				content: [{
					type: 'text',
					text: JSON.stringify({
						config,
						validation,
						usage: validation.valid
							? 'This config can be imported into Stratify via the "Import JSON" button, or saved via the save_chart tool.'
							: 'Fix the errors above before using this config.'
					}, null, 2)
				}]
			};
		}

		case 'validate_chart_config': {
			const { config } = args;
			if (!config) {
				return {
					content: [{ type: 'text', text: JSON.stringify({ error: 'config is required' }) }],
					isError: true
				};
			}
			const result = validateSnapshot(config);
			return {
				content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
			};
		}

		default:
			return null;
	}
}
