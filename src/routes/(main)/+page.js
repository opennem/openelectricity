// import parser from '$lib/models/parser.js';
import energyParser from '$lib/opennem/parser.js';

/** @type {import('./$types').PageLoad} */
export async function load({ data, fetch }) {
	try {
		const allNemEnergyData = await fetch('/api/energy').then(async (res) => {
			const jsonData = await res.json();
			return energyParser(jsonData.data);
		});

		const years = [new Date().getFullYear(), new Date().getFullYear() - 1];
		const dailyData = await Promise.all(
			years.map(async (year) => {
				return fetch(`/api/energy?year=${year}`).then(async (res) => {
					const jsonData = await res.json();
					const energyData = jsonData.data.filter(
						(/** @type {StatsData} */ d) => d.type === 'energy' && d.fuel_tech
					);
					return energyData;
				});
			})
		);
		const dailyNemEnergyData = dailyData[0];
		const previousYearData = dailyData[1];
		dailyNemEnergyData.forEach((/** @type {StatsData} */ d) => {
			const fuelTechPreviousYearData = previousYearData.find(
				(/** @type {StatsData} */ p) => p.fuel_tech === d.fuel_tech
			);
			if (fuelTechPreviousYearData) {
				d.history.data = [...fuelTechPreviousYearData.history.data, ...d.history.data];
				d.history.start = fuelTechPreviousYearData.history.start;
			} else {
				console.warn('No previous year data found for', d.fuel_tech);
			}
		});

		return {
			...data, // pipe through data from PageServer

			allNemEnergyData,
			dailyNemEnergyData
		};
	} catch (error) {
		console.error(error);
		return {
			...data, // pipe through data from PageServer
			allNemEnergyData: [],
			dailyNemEnergyData: []
		};
	}
}
