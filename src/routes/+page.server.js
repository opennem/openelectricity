import { error } from '@sveltejs/kit';
import { differenceInMonths, parse } from 'date-fns';

import { PUBLIC_JSON_API } from '$env/static/public';
import { client } from '$lib/sanity';
import { energyData } from '$lib/stats';
import ispData from '$lib/isp';
import useDate from '$lib/utils/time-series-helpers/use-date';

/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
	const homepageData = await client.fetch(
		`*[_type == "homepage"]{_id, banner_title, banner_statement, map_title, chart_title, records_title, analysis_title, goals_title, goals}`
	);
	const articles = await client.fetch(`*[_type == "article"][0..3]{_id, title, content, slug}`);

	const recordsRes = await fetch('/api/records');
	let records = [];

	if (recordsRes && recordsRes.ok) {
		records = await recordsRes.json();
	}

	const { annual, live } = await energyData();
	const { outlookEnergyNem, pathways, scenarios, fuelTechs } = ispData();

	const dataTrackerRes = await fetch(`${PUBLIC_JSON_API}/au/NEM/power/7d.json`);
	const { data: dataTrackerJson } = await dataTrackerRes.json();
	const dataTrackerData = dataTrackerJson.filter(
		(/** @type {import('$lib/types/stats.types').StatsData} */ d) => d.fuel_tech
	);

	// au/NEM/energy/all.json

	const historyEnergyNemRes = await fetch(`${PUBLIC_JSON_API}/au/NEM/energy/all.json`);
	const { data: historyEnergyNemJson } = await historyEnergyNemRes.json();
	const historyEnergyNemData = historyEnergyNemJson.filter(
		(/** @type {import('$lib/types/stats.types').StatsData} */ d) =>
			d.fuel_tech && d.data_type === 'energy'
	);

	const parseAndUseDate = (dateStr) => parse(useDate(dateStr), 'yyyy-MM-dd', new Date());

	// match up the history data to same start and last, using coal_black as the reference since it always exists in the dataset
	const coalBlack = historyEnergyNemData.find((d) => d.fuel_tech === 'coal_black');

	const dataStart = coalBlack?.history.start || '1998-12-01';
	const dataLast = coalBlack?.history.last || '2023-12-01';

	historyEnergyNemData.forEach((d) => {
		const startDiff = differenceInMonths(
			parseAndUseDate(d.history.start),
			parseAndUseDate(dataStart)
		);
		const lastDiff = differenceInMonths(parseAndUseDate(dataLast), parseAndUseDate(d.history.last));

		if (startDiff > 0) {
			for (let i = 0; i < startDiff; i++) {
				d.history.data.unshift(null);
			}

			d.history.start = dataStart;
		}
		if (lastDiff > 0) {
			console.warn('Last dates are different, need to pad data.');
		}
	});

	if (homepageData && homepageData.length > 0) {
		return {
			...homepageData[0],
			articles,
			records,
			annual,
			live,

			outlookEnergyNem,
			pathways,
			scenarios,
			fuelTechs,

			dataTrackerData,
			historyEnergyNemData
		};
	}

	throw error(404, 'Not found');
}
