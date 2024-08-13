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
	const region = searchParams.get('region');
	// const fuelTechs = url.searchParams.get('fuel_techs');
	let dateParams = '';
	let pageParams = '';
	let regionParams = '';

	// const f = 'yyyy-MM-dd';

	// if (date) {
	// 	dateParams = `&date_start=${date}&date_end=${format(addDays(new Date(date), 1), f)}`;
	// }

	if (pageNum) {
		pageParams = `&page=${pageNum}`;
	}
	if (region && region !== 'nem') {
		regionParams = `&network=NEM&network_region=${region.toUpperCase()}`;
	}
	// const metricParams =
	// '&metric=generation&metric=emissions&metric=price&metric=demand&metric=energy';
	const metricParams = '';
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
	/** @type {string[]} */
	const fuelTechs = [];
	const fuelTechParams = fuelTechs.map((tech) => `&fuel_tech=${tech}`).join('');
	const path = `${PUBLIC_RECORDS_API}?limit=100${fuelTechParams}${metricParams}${dateParams}${pageParams}${regionParams}`;
	const response = await fetch(path);

	if (response.ok) {
		const data = await response.json();
		return Response.json(data);
	}

	return Response.json({ error: 'Error reading from milestones API.' }, { status: 500 });
}
