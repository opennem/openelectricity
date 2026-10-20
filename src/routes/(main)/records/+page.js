import { defaultSignificance, parseListParam } from './page-data-options/filters.js';

export async function load({ url, data }) {
	const { searchParams } = url;
	const page = searchParams.get('page');
	// const aggregates = searchParams.get('aggregates');
	const significance = searchParams.get('significance');

	return {
		...data, // Include server data (pinnedRecords)
		// page: page ? parseInt(page) : 1,
		regions: parseListParam(searchParams.get('regions')),
		periods: parseListParam(searchParams.get('periods')),
		// aggregates: aggregates ? aggregates.split(',') : [],
		aggregates: [], // ignore for now
		metrics: parseListParam(searchParams.get('metrics')),
		// stringFilter: searchParams.get('recordIdFilter') || '',
		stringFilter: '', // ignore for now
		fuelTechs: parseListParam(searchParams.get('fuel_techs')),
		significance: significance ? parseInt(significance) : defaultSignificance
	};
}
