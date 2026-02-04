import { error } from '@sveltejs/kit';
import { PUBLIC_JSON_API } from '$env/static/public';

export async function GET({ fetch, setHeaders }) {
	setHeaders({
		'cache-control': 'max-age=300'
	});

	const regions = ['NSW1', 'QLD1', 'SA1', 'TAS1', 'VIC1'];
	const regionKeys = ['NSW', 'QLD', 'SA', 'TAS', 'VIC'];

	const [
		...powerResponses
	] = await Promise.all(
		regions.map((r) => fetch(`${PUBLIC_JSON_API}/au/NEM/${r}/power/7d.json`))
	);

	const [
		...energyResponses
	] = await Promise.all([
		...regions.map((r) => fetch(`${PUBLIC_JSON_API}/au/NEM/${r}/energy/all.json`)),
		fetch(`${PUBLIC_JSON_API}/au/WEM/energy/all.json`)
	]);

	const allPowerOk = powerResponses.every((r) => r.ok);
	const allEnergyOk = energyResponses.every((r) => r.ok);

	if (!allPowerOk || !allEnergyOk) {
		error(404, 'Not found');
	}

	const powerJsons = await Promise.all(powerResponses.map((r) => r.json()));
	const energyJsons = await Promise.all(energyResponses.map((r) => r.json()));

	const powerFilter = (d) => d.fuel_tech && d.type === 'power';
	const energyFilter = (d) => d.fuel_tech && d.type === 'energy';
	const emissionsFilter = (d) => d.fuel_tech && d.type === 'emissions';

	const latestData = (d) => ({
		region: d.region,
		id: d.id,
		fuel_tech: d.fuel_tech,
		data_type: d.data_type,
		units: d.units,
		data: d.history.data[d.history.data.length - 1]
	});

	const latest12MonthsSumData = (d) => ({
		region: d.region,
		id: d.id,
		fuel_tech: d.fuel_tech,
		data_type: d.data_type,
		units: d.units,
		data: d.history.data.slice(-12).reduce((acc, cur) => acc + cur, 0)
	});

	/** @type {Record<string, any>} */
	const power = {};
	/** @type {Record<string, any>} */
	const energy = {};
	/** @type {Record<string, any>} */
	const emissions = {};

	regionKeys.forEach((key, i) => {
		power[key] = powerJsons[i].data.filter(powerFilter).map(latestData);
		energy[key] = energyJsons[i].data.filter(energyFilter).map(latest12MonthsSumData);
		emissions[key] = energyJsons[i].data.filter(emissionsFilter).map(latest12MonthsSumData);
	});

	// WA energy/emissions (index 5 in energyJsons)
	const waData = energyJsons[5].data;
	energy['WA'] = waData.filter(energyFilter).map(latest12MonthsSumData);
	emissions['WA'] = waData.filter(emissionsFilter).map(latest12MonthsSumData);

	return Response.json({ power, energy, emissions });
}
