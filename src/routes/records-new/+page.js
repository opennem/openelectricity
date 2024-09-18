export async function load({ url }) {
	const { searchParams } = url;
	const page = searchParams.get('page');
	const regions = searchParams.get('regions');
	const periods = searchParams.get('periods');
	const fuelTechs = searchParams.get('fuel_techs');
	const aggregates = searchParams.get('aggregates');
	const milestone_types = searchParams.get('milestone_types');
	const significance = searchParams.get('significance');

	return {
		records: [],
		page: page ? parseInt(page) : 1,
		regions: regions ? regions.split(',') : [],
		periods: periods ? periods.split(',') : [],
		aggregates: aggregates ? aggregates.split(',') : [],
		milestoneTypes: milestone_types ? milestone_types.split(',') : [],
		stringFilter: searchParams.get('recordIdFilter') || '',
		fuelTechs: fuelTechs ? fuelTechs.split(',') : [],
		significance: significance ? parseInt(significance) : null
	};
}
