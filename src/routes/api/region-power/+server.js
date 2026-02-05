import { error } from '@sveltejs/kit';
import { PUBLIC_JSON_API } from '$env/static/public';

export async function GET({ fetch, setHeaders }) {
	setHeaders({
		'cache-control': 'max-age=300' // 5 mins
	});

	const nsw = await fetch(`${PUBLIC_JSON_API}/au/NEM/NSW1/power/7d.json`);
	const qld = await fetch(`${PUBLIC_JSON_API}/au/NEM/QLD1/power/7d.json`);
	const sa = await fetch(`${PUBLIC_JSON_API}/au/NEM/SA1/power/7d.json`);
	const tas = await fetch(`${PUBLIC_JSON_API}/au/NEM/TAS1/power/7d.json`);
	const vic = await fetch(`${PUBLIC_JSON_API}/au/NEM/VIC1/power/7d.json`);

	const powerFilter = (/** @type {any} */ d) => d.fuel_tech && d.type === 'power';
	const latestData = (/** @type {any} */ d) => {
		return {
			region: d.region,
			id: d.id,
			fuel_tech: d.fuel_tech,
			data_type: d.data_type,
			units: d.units,
			data: d.history.data[d.history.data.length - 1]
		};
	};

	if (nsw.ok && qld.ok && sa.ok && tas.ok && vic.ok) {
		const { data: nswData } = await nsw.json();
		const { data: qldData } = await qld.json();
		const { data: saData } = await sa.json();
		const { data: tasData } = await tas.json();
		const { data: vicData } = await vic.json();

		return Response.json({
			NSW: nswData.filter(powerFilter).map(latestData),
			QLD: qldData.filter(powerFilter).map(latestData),
			SA: saData.filter(powerFilter).map(latestData),
			TAS: tasData.filter(powerFilter).map(latestData),
			VIC: vicData.filter(powerFilter).map(latestData)
		});
	}

	error(404, 'Not found');
}
