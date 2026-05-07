/**
 * Static labels and units for the active "Show by" metric. Single source of
 * truth for List column headers, FacilityCard cells, and any other surface
 * that needs to render the metric value in user-facing units.
 *
 * @param {{
 *   metric: 'capacity' | 'generation' | 'pollution' | 'emissions',
 *   category?: string,
 *   generationMode?: 'live' | 'daily'
 * }} active
 * @returns {{ label: string, shortLabel: string, unit: string }}
 */
export function getMetricMeta({ metric, category, generationMode }) {
	if (metric === 'generation') {
		return generationMode === 'live'
			? { label: 'Live power', shortLabel: 'Power', unit: 'MW' }
			: { label: 'Daily energy', shortLabel: 'Energy', unit: 'MWh' };
	}
	if (metric === 'pollution') {
		/** @type {Record<string, { label: string, shortLabel: string }>} */
		const labels = {
			air_pollutant: { label: 'Air pollution', shortLabel: 'Air' },
			water_pollutant: { label: 'Water pollution', shortLabel: 'Water' },
			heavy_metal: { label: 'Heavy metals', shortLabel: 'Metals' },
			organic: { label: 'Organic pollutants', shortLabel: 'Organic' }
		};
		const c = labels[category ?? 'air_pollutant'] ?? labels.air_pollutant;
		return { ...c, unit: 'kg/yr' };
	}
	if (metric === 'emissions') {
		return { label: 'Emissions', shortLabel: 'Emissions', unit: 'tCO₂e' };
	}
	return { label: 'Capacity', shortLabel: 'Capacity', unit: 'MW' };
}

/**
 * @param {{
 *   metric: 'capacity' | 'generation' | 'pollution' | 'emissions',
 *   category?: string,
 *   generationMode?: 'live' | 'daily'
 * }} active
 * @returns {boolean}
 */
export function isMetricActive({ metric }) {
	return metric !== 'capacity';
}
