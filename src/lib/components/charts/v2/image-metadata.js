/** Small presentation-only snapshot; never serialise the underlying chart data.
 * @param {import('./ChartStore.svelte.js').default} chart */
export function chartImageMetadata(chart) {
	const options = chart.chartOptions;
	return {
		hasData: chart.seriesData.length > 0,
		title: chart.title,
		unit: options.isDataTransformTypeProportion
			? (chart.proportionContext?.label ?? '%')
			: options.displayUnit,
		transform: options.isDataTransformTypeChangeSince ? 'Change since start' : '',
		legend: [
			...chart.visibleSeriesNames.map((id) => ({
				label: chart.seriesLabels[id] || id,
				colour: chart.seriesColours[id] || '#555'
			})),
			...[
				...chart.displayOverlayLines,
				...chart.displayOverlayAreas.flatMap((area) => area.series)
			].map((overlay) => ({
				label: `${overlay.label || overlay.id}${overlay.tooltipUnit ? ` (${overlay.tooltipUnit})` : ''}`,
				colour: overlay.colour
			}))
		]
	};
}
