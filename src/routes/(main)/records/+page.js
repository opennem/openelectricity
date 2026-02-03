export async function load({ url, data }) {
	const { searchParams } = url;
	const page = searchParams.get('page');
	const regions = searchParams.get('regions');
	const periods = searchParams.get('periods');
	const fuelTechs = searchParams.get('fuel_techs');
	// const aggregates = searchParams.get('aggregates');
	const metrics = searchParams.get('metrics');
	// const significance = searchParams.get('significance');

	return {
		...data, // Include server data (pinnedRecords)
		// page: page ? parseInt(page) : 1,
		regions: regions ? regions.split(',') : [],
		periods: periods ? periods.split(',') : [],
		// aggregates: aggregates ? aggregates.split(',') : [],
		aggregates: [], // ignore for now
		metrics: metrics ? metrics.split(',') : [],
		// stringFilter: searchParams.get('recordIdFilter') || '',
		stringFilter: '', // ignore for now
		fuelTechs: fuelTechs ? fuelTechs.split(',') : [],
		// significance: significance ? parseInt(significance) : null
		significance: 9 // always 9+
	};
}
