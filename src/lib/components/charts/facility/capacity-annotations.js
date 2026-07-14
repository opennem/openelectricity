/**
 * Capacity reference-line and y-domain rules for the facility generation
 * chart, extracted from FacilityChart's effect as a pure function so the
 * business rules are testable in isolation.
 */

/**
 * @typedef {{ value: number, label: string, colour: string }} ReferenceLine
 */

/**
 * @param {Object} args
 * @param {boolean} args.isEnergyMetric - MW capacity doesn't apply to MWh charts
 * @param {boolean} args.showAnnotations - Whether the consumer asked for capacity annotations
 * @param {boolean} args.isProportion - Proportion transform active
 * @param {boolean} args.isChangeSince - Change-since transform active
 * @param {boolean} args.isLine - Line (non-stacked) chart type active
 * @param {{ positive: number, negative: number }} args.capacitySums - Nameplate capacity sums (MW)
 * @param {boolean} args.hasBatteryUnits - Battery facilities get a symmetric domain
 * @returns {{ yReferenceLines: ReferenceLine[], yDomain: [number, number] | undefined }}
 */
export function capacityAnnotations({
	isEnergyMetric,
	showAnnotations,
	isProportion,
	isChangeSince,
	isLine,
	capacitySums,
	hasBatteryUnits
}) {
	/** @type {{ yReferenceLines: ReferenceLine[], yDomain: [number, number] | undefined }} */
	const none = { yReferenceLines: [], yDomain: undefined };

	// No capacity reference lines for energy charts (MW doesn't apply to MWh),
	// proportion mode, or when annotations weren't requested — the chart then
	// uses its data-driven domain (computeYDomain with +10% padding) instead of
	// pinning to nameplate capacity, so dispatch data fills the chart naturally
	// without empty headroom above the peak.
	if (isEnergyMetric || isProportion || !showAnnotations) return none;

	const padding = 0.15;

	if (isLine || isChangeSince) {
		const maxCapacity = Math.max(capacitySums.positive, capacitySums.negative);
		if (maxCapacity <= 0) return none;
		return {
			yReferenceLines: [{ value: maxCapacity, label: 'Capacity', colour: 'var(--chart-1)' }],
			yDomain: [0, maxCapacity * (1 + padding)]
		};
	}

	/** @type {ReferenceLine[]} */
	const yReferenceLines = [];
	if (capacitySums.positive > 0) {
		yReferenceLines.push({
			value: capacitySums.positive,
			label: 'Generation Capacity',
			colour: 'var(--chart-1)'
		});
	}
	if (capacitySums.negative > 0) {
		yReferenceLines.push({
			value: -capacitySums.negative,
			label: 'Load Capacity',
			colour: 'var(--chart-1)'
		});
	}

	const yMax = capacitySums.positive > 0 ? capacitySums.positive * (1 + padding) : undefined;
	const yMin = capacitySums.negative > 0 ? -capacitySums.negative * (1 + padding) : undefined;
	if (yMax === undefined && yMin === undefined) {
		return { yReferenceLines, yDomain: undefined };
	}

	// Batteries render charge below zero — keep the domain symmetric when only
	// one side has nameplate capacity.
	const minValue = hasBatteryUnits ? (yMin ?? -(yMax ?? 0)) : (yMin ?? 0);
	return { yReferenceLines, yDomain: [minValue, yMax ?? 0] };
}
