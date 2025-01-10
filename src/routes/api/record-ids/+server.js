import { PUBLIC_RECORDS_API, PUBLIC_API_KEY } from '$env/static/public';

export async function GET({ url, fetch, setHeaders }) {
	setHeaders({
		Authorization: `Bearer ${PUBLIC_API_KEY}`
	});

	// const date = url.searchParams.get('date');
	const { searchParams } = url;

	const pageNum = searchParams.get('page');
	const pageSize = searchParams.get('pageSize');
	const regions = searchParams.get('regions');
	const periods = searchParams.get('periods');
	const recordIdFilter = searchParams.get('recordIdFilter');
	const fuelTechs = searchParams.get('fuelTechs');
	const aggregates = searchParams.get('aggregates');
	const metrics = searchParams.get('metrics') || searchParams.get('milestone_types');
	const significance = searchParams.get('significance');

	let dateParams = '';
	let pageParams = '';
	let regionParams = '';
	let periodParms = '';
	let recordIdFilterParams = '';
	let fuelTechParams = '';
	let aggregateParams = '';
	let metricParams = '';
	let significanceParams = '';

	// const f = 'yyyy-MM-dd';

	// if (date) {
	// 	dateParams = `&date_start=${date}&date_end=${format(addDays(new Date(date), 1), f)}`;
	// }

	if (pageNum) {
		pageParams = `&page=${pageNum}`;
	}

	if (pageSize) {
		pageParams += `&limit=${pageSize}`;
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
			.map((i) => `&milestone_type=${i}`)
			.join('');
	}

	if (fuelTechs) {
		fuelTechParams = fuelTechs
			.split(',')
			.map((i) => `&fueltech_id=${i}`)
			.join('');
	}

	if (significance) {
		significanceParams = `&significance=${significance}`;
	}

	if (regions) {
		console.log('api regions', regions);
		const regionArr = regions.split(',');

		const withoutNetworks = regionArr.filter((r) => r !== 'nem' && r !== 'wem');

		if (withoutNetworks.length > 0) {
			const hasWem = regionArr.includes('wem');
			regionParams =
				`&network=NEM` + withoutNetworks.map((r) => `&network_region=${r.toUpperCase()}`).join('');

			if (hasWem) {
				regionParams += '&network=WEM';
			}
		} else {
			const hasNem = regionArr.includes('nem');
			const hasWem = regionArr.includes('wem');

			if (hasNem) {
				regionParams += '&network=NEM';
			}
			if (hasWem) {
				regionParams += '&network=WEM';
			}
		}
	} else {
		// if no regions are selected, we default to all regions, switch to record_filter
		console.log('no regions selected');
		// regionParams += '&network=NEM';
		// regionParams += '&network=WEM';
		// regionParams = '&record_filter=NEM&record_filter=WEM';
	}

	console.log('pageNum/Size', pageNum, pageSize);
	console.log('pageParams', pageParams);
	console.log('-----');
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
	const path = `${PUBLIC_RECORDS_API}/record_id?${fuelTechParams}${metricParams}${aggregateParams}${dateParams}${pageParams}${regionParams}${periodParms}${recordIdFilterParams}${significanceParams}`;

	console.log('record_id path', path);
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
