import { differenceInMonths, parse } from 'date-fns';
import { PUBLIC_JSON_API } from '$env/static/public';
import ispData from '$lib/isp';
import useDate from '$lib/utils/time-series-helpers/use-date';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const { outlookEnergyNem, fuelTechs } = ispData();

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

	return {
		outlookEnergyNem,
		fuelTechs,
		historyEnergyNemData
	};
}
