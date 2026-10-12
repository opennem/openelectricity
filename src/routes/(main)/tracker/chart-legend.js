/**
 * The colour keys chart cards show when nothing else on screen names their
 * colours (`SeriesLegend`). Pure module.
 */

/** @typedef {{ id: string, label: string, colour: string, line?: boolean }} LegendItem */

/**
 * A stacked chart's key: each visible series from the top of the stack
 * down, as the fuel-tech table lists them (sources, then loads), then the
 * overlay lines (demand, renewables) and bands (curtailment) drawn on it.
 * Ids are the series' own, with overlay lines prefixed so neither collides.
 * @param {{
 *   snapshot: { seriesNames: string[], seriesLabels?: Record<string, string>, seriesColours?: Record<string, string> } | null | undefined,
 *   hidden?: string[],
 *   lines?: Array<{ id: string, label: string, colour: string }>,
 *   areas?: Array<{ series: Array<{ id: string, label: string, colour: string }> }>
 * }} input
 * @returns {LegendItem[]}
 */
export function seriesLegendItems({ snapshot, hidden = [], lines = [], areas = [] }) {
	if (!snapshot) return [];
	return [
		...snapshot.seriesNames
			.filter((name) => !hidden.includes(name))
			.reverse()
			.map((name) => ({
				id: name,
				label: snapshot.seriesLabels?.[name] ?? name,
				colour: snapshot.seriesColours?.[name] ?? 'currentColor'
			})),
		...lines.map((line) => ({
			id: `overlay:${line.id}`,
			label: line.label,
			colour: line.colour,
			line: true
		})),
		...areas.flatMap((area) =>
			area.series.map((series) => ({ id: series.id, label: series.label, colour: series.colour }))
		)
	];
}
