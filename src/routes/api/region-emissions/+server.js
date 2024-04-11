import { error } from '@sveltejs/kit';
import { PUBLIC_JSON_API } from '$env/static/public';

export async function GET({ fetch, setHeaders }) {
	setHeaders({
		'cache-control': 'max-age=1800' // 30 mins
	});
	const nsw = await fetch(`${PUBLIC_JSON_API}/au/NEM/NSW1/energy/all.json`);
	const qld = await fetch(`${PUBLIC_JSON_API}/au/NEM/QLD1/energy/all.json`);
	const sa = await fetch(`${PUBLIC_JSON_API}/au/NEM/SA1/energy/all.json`);
	const tas = await fetch(`${PUBLIC_JSON_API}/au/NEM/TAS1/energy/all.json`);
	const vic = await fetch(`${PUBLIC_JSON_API}/au/NEM/VIC1/energy/all.json`);
	const wa = await fetch(`${PUBLIC_JSON_API}/au/WEM/energy/all.json`);

	const emissionsFilter = (d) => d.fuel_tech && d.type === 'emissions';
	const latest12MonthsSumData = (d) => {
		return {
			region: d.region,
			id: d.id,
			fuel_tech: d.fuel_tech,
			data_type: d.data_type,
			units: d.units,
			data: d.history.data.slice(-12).reduce((acc, cur) => acc + cur, 0)
		};
	};

	if (nsw.ok && qld.ok && sa.ok && tas.ok && vic.ok && wa.ok) {
		const { data: nswData } = await nsw.json();
		const { data: qldData } = await qld.json();
		const { data: saData } = await sa.json();
		const { data: tasData } = await tas.json();
		const { data: vicData } = await vic.json();
		const { data: waData } = await wa.json();

		return Response.json({
			NSW: nswData.filter(emissionsFilter).map(latest12MonthsSumData),
			QLD: qldData.filter(emissionsFilter).map(latest12MonthsSumData),
			SA: saData.filter(emissionsFilter).map(latest12MonthsSumData),
			TAS: tasData.filter(emissionsFilter).map(latest12MonthsSumData),
			VIC: vicData.filter(emissionsFilter).map(latest12MonthsSumData),
			WA: waData.filter(emissionsFilter).map(latest12MonthsSumData)
		});
	}

	error(404, 'Not found');
}
