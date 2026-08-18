/**
 * @typedef {Object} StratifyGuide
 * @property {string} slug
 * @property {string} title
 * @property {string} summary
 * @property {string} introduction
 * @property {Array<{heading: string, body: string, points?: string[]}>} sections
 * @property {string[]} relatedTypes
 */

/** @type {StratifyGuide[]} */
export const stratifyGuides = [
	{
		slug: 'prepare-your-data',
		title: 'Prepare your data',
		summary: 'Shape a spreadsheet so Stratify can understand it immediately.',
		introduction:
			'Stratify works best with tidy CSV or tab-separated data: one row per observation, one column per measure and a single header row.',
		sections: [
			{
				heading: 'Put X values first',
				body: 'The first column normally becomes the horizontal dimension: a date, time, category or number.',
				points: [
					'Use ISO dates such as 2026-07-01T09:30:00+10:00.',
					'Use consistent category spelling.'
				]
			},
			{
				heading: 'Keep measures numeric',
				body: 'Remove units and explanatory text from numeric cells. Put the unit in the column header or axis label instead.',
				points: [
					'Write 1250, not 1,250 MW.',
					'Leave genuinely missing values blank rather than writing N/A.'
				]
			},
			{
				heading: 'Check the parsed table',
				body: 'Use the Parsed tab before styling. If dates or measures are wrong there, fix the source data first.'
			}
		],
		relatedTypes: ['line', 'column', 'map']
	},
	{
		slug: 'titles-sources-and-notes',
		title: 'Write titles, sources and notes',
		summary: 'Make a chart understandable without extra explanation.',
		introduction:
			'A strong chart explains its finding, measure, period and source without asking the reader to decode the configuration.',
		sections: [
			{
				heading: 'State the finding',
				body: 'Prefer a specific takeaway such as “Battery discharge doubled in three years” over a topic label such as “Battery discharge”.'
			},
			{
				heading: 'Add context below the title',
				body: 'Use the description for scope and definitions. Keep methodology and caveats in Notes.'
			},
			{
				heading: 'Name the source',
				body: 'Identify the organisation or dataset clearly enough that another person can find it.'
			}
		],
		relatedTypes: []
	},
	{
		slug: 'axes-and-number-formatting',
		title: 'Configure axes and numbers',
		summary: 'Use scales, labels and tick formatting that match the data.',
		introduction: 'Axes should tell readers what values mean without competing with the data.',
		sections: [
			{
				heading: 'Choose the right X mode',
				body: 'Use Date / time for temporal spacing, Category for labels and Linear number for measured numeric values.'
			},
			{
				heading: 'Label units once',
				body: 'Write MW, GWh, percentages or dollars in the axis label. Avoid repeating a unit in every cell.'
			},
			{
				heading: 'Use zero deliberately',
				body: 'Bar and column charts normally need a zero baseline. Line charts can use a tighter range when the purpose is to show variation.'
			}
		],
		relatedTypes: ['line', 'scatter', 'column', 'bar']
	},
	{
		slug: 'colour-series-and-legends',
		title: 'Use colour, series and legends',
		summary: 'Make important series recognisable without producing visual clutter.',
		introduction:
			'Colour should carry meaning, distinguish series or direct attention—not decorate every available element.',
		sections: [
			{
				heading: 'Use familiar energy colours',
				body: 'The Open Electricity palette gives fuel technologies consistent colours. Override only when the story needs a different emphasis.'
			},
			{
				heading: 'Rename technical headers',
				body: 'Use series labels to turn source-system column names into clear reader-facing language.'
			},
			{
				heading: 'Remove redundant legends',
				body: 'A single-series chart with a clear title often does not need a legend.'
			}
		],
		relatedTypes: ['area', 'column-stacked', 'bar-grouped']
	},
	{
		slug: 'tooltips-facets-and-animation',
		title: 'Configure tooltips, facets and animation',
		summary: 'Add detail and comparison without overloading the default view.',
		introduction:
			'Interaction can reveal supporting detail, while facets and animation can separate repeated comparisons.',
		sections: [
			{
				heading: 'Keep tooltips focused',
				body: 'Include the fields a reader needs to verify a point. Reorder them to match the chart story.'
			},
			{
				heading: 'Format dates for the observation',
				body: 'Choose Date, Time or Date + time. Stratify formats temporal values in en-AU.'
			},
			{
				heading: 'Split repeated groups',
				body: 'Use facets when the same comparison repeats across regions, scenarios or technologies. Animate only when sequence adds meaning.'
			}
		],
		relatedTypes: ['line', 'scatter', 'area']
	},
	{
		slug: 'annotations',
		title: 'Add annotations',
		summary: 'Mark events and exact points with the guided annotation editor.',
		introduction:
			'Annotations should explain why a value changed or identify the moment readers should notice.',
		sections: [
			{
				heading: 'Choose an annotation type',
				body: 'Add an annotation, then choose Rule to mark an X position or Point to call out an exact value.'
			},
			{
				heading: 'Choose point position',
				body: 'Y value places the point at an explicit value. Series resolves the selected chart series at the nearest X value.'
			},
			{
				heading: 'Use colour sparingly',
				body: 'Set line or dot and label colours in each annotation’s Appearance section, and reserve strong colour for the most important events.'
			}
		],
		relatedTypes: ['line', 'scatter', 'area']
	},
	{
		slug: 'publish-export-and-embed',
		title: 'Publish, export and embed',
		summary: 'Choose the right way to deliver a finished chart.',
		introduction:
			'Save a draft while working, publish for a stable public link, or export an image for a document or presentation.',
		sections: [
			{
				heading: 'Publish for the web',
				body: 'Publishing creates a public Strata page and makes the chart available for an iframe embed.'
			},
			{
				heading: 'Export for static use',
				body: 'Use SVG for editable vector artwork and PNG for a ready-to-use raster image.'
			},
			{
				heading: 'Keep a portable configuration',
				body: 'Export JSON when you need a restorable copy of the data and all chart settings.'
			}
		],
		relatedTypes: []
	}
];

/** @param {string} slug */
export function getStratifyGuide(slug) {
	return stratifyGuides.find((guide) => guide.slug === slug) ?? null;
}
