import { endOfDay, startOfDay, format, nextDay, addDays } from 'date-fns';
import { PUBLIC_RECORDS_API, PUBLIC_API_KEY } from '$env/static/public';

export async function GET({ url, fetch, setHeaders }) {
	setHeaders({
		'cache-control': 'max-age=0',
		Authorization: `Bearer ${PUBLIC_API_KEY}`
	});

	// const date = url.searchParams.get('date');
	const { searchParams } = url;

	const pageNum = searchParams.get('page');
	const regions = searchParams.get('regions');
	const periods = searchParams.get('periods');
	const recordIdFilter = searchParams.get('recordIdFilter');
	const fuelTechs = searchParams.get('fuelTechs');
	const aggregates = searchParams.get('aggregates');
	const metrics = searchParams.get('metrics');

	let dateParams = '';
	let pageParams = '';
	let regionParams = '';
	let periodParms = '';
	let recordIdFilterParams = '';
	let fuelTechParams = '';
	let aggregateParams = '';
	let metricParams = '';

	// const f = 'yyyy-MM-dd';

	// if (date) {
	// 	dateParams = `&date_start=${date}&date_end=${format(addDays(new Date(date), 1), f)}`;
	// }

	if (pageNum) {
		pageParams = `&page=${pageNum}`;
	}

	if (recordIdFilter) {
		recordIdFilterParams = `&record_id_filter=${recordIdFilter}`;
	}

	if (periods) {
		periodParms = periods
			.split(',')
			.map((i) => `&period=${i}`)
			.join('');
	}

	if (aggregates) {
		aggregateParams = aggregates
			.split(',')
			.map((i) => `&aggregate=${i}`)
			.join('');
	}
	if (metrics) {
		metricParams = metrics
			.split(',')
			.map((i) => `&metric=${i}`)
			.join('');
	}

	if (fuelTechs) {
		fuelTechParams = fuelTechs
			.split(',')
			.map((i) => `&fueltech_id=${i}`)
			.join('');
	}

	if (regions) {
		const regionArr = regions.split(',');

		// if all regions are selected, we don't need to specify the network
		// - the 6 regions are nem, nsw1, qld1, sa1, tas1, vic1
		// if (regionArr.length === 6) {
		// 	regionParams = '';
		// } else {
		// 	const withoutNem = regionArr.filter((r) => r !== 'nem');

		// 	if (withoutNem.length > 0) {
		// 		regionParams =
		// 			`&network=NEM` + withoutNem.map((r) => `&network_region=${r.toUpperCase()}`).join('');
		// 	} else {
		// 		// only nem
		// 		regionParams = `&network=NEM`;
		// 	}
		// }

		const withoutNem = regionArr.filter((r) => r !== 'nem');

		if (withoutNem.length > 0) {
			regionParams =
				`&network=NEM` + withoutNem.map((r) => `&network_region=${r.toUpperCase()}`).join('');
		} else {
			// only nem,
			regionParams = `&network=NEM`;
		}
	} else {
		// if no regions are selected, we default to all regions, switch to record_filter
		regionParams = '&record_filter=NEM';
	}

	console.log('periods', periods);
	console.log('periodParms', periodParms);
	console.log('-----');
	console.log('fuelTechs', fuelTechs);
	console.log('fuelTechParams', fuelTechParams);
	console.log('-----');
	console.log('regions', regions);
	console.log('regionParams', regionParams);
	console.log('-----');
	console.log('recordIdFilter', recordIdFilter);
	console.log('recordIdFilterParams', recordIdFilterParams);

	// const metricParams =
	// '&metric=generation&metric=emissions&metric=price&metric=demand&metric=energy';
	// const metricParams = '';
	// const fuelTechs = [
	// 	'coal',
	// 	'gas',
	// 	'hydro',
	// 	'wind',
	// 	'solar',
	// 	'bioenergy',
	// 	'pumps',
	// 	'battery_charging',
	// 	'battery_discharging'
	// ];
	// const fuelTechs = [];
	// const fuelTechParams = fuelTechs.map((tech) => `&fuel_tech=${tech}`).join('');
	const path = `${PUBLIC_RECORDS_API}?limit=100${fuelTechParams}${metricParams}${aggregateParams}${dateParams}${pageParams}${regionParams}${periodParms}${recordIdFilterParams}`;

	console.log('path', path);
	const response = await fetch(path);

	if (response.ok) {
		const data = await response.json();
		return Response.json(data);
	} else {
		const data = await response.json();
		console.log('response', data);
	}

	return Response.json({ error: 'Error reading from milestones API.' }, { status: 500 });
}
