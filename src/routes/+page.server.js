import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity';
import { format, isToday } from 'date-fns';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, fetch }) {
	const homepageData = await client.fetch(
		`*[_type == "homepage"]{_id, banner_title, banner_statement, map_title, chart_title, records_title, analysis_title, goals_title, goals}`
	);
	const articles = await client.fetch(`*[_type == "article"][0..3]{_id, title, content, slug}`);

	const recordsRes = await fetch('/api/records');
	let records = [];

	if (recordsRes && recordsRes.ok) {
		records = await recordsRes.json();
	}

	// Fetch live flows data from API
	const flowsResponse = await fetch('https://api.opennem.org.au/stats/flow/network/nem');
	const flows = {};
	let dispatchTime = new Date();

	if (flowsResponse.ok) {
		let flowsData = await flowsResponse.json();
		dispatchTime = Date.parse(flowsData.data[0].history.last);

		flowsData.data.every((region) => {
			flows[region.code] = region.history.data[region.history.data.length - 1];
			return true;
		});
	}

	const annual = {
		dispatch: 'Avg. Past 12 months',
		columns: [
			{ id: 'state', label: '', unit: '' },
			{ id: 'price', label: 'Price', unit: '' },
			{ id: 'generation', label: 'Generation', unit: 'MW' },
			{ id: 'renewable', label: 'Renewable', unit: '%' },
			{ id: 'intensity', label: 'Carbon Intensity', unit: 'KgCO2 / MWh' }
		],
		rows: [
			{
				state: 'WA',
				price: 56.45,
				generation: 18256,
				renewable: 45,
				intensity: 420
			},
			{
				state: 'QLD',
				price: 56.45,
				generation: 18256,
				renewable: 45,
				intensity: 420
			},
			{
				state: 'NSW',
				price: 56.45,
				generation: 18256,
				renewable: 45,
				intensity: 420
			},
			{
				state: 'SA',
				price: 56.45,
				generation: 18256,
				renewable: 45,
				intensity: 420
			},
			{
				state: 'VIC',
				price: 56.45,
				generation: 18256,
				renewable: 45,
				intensity: 420
			},
			{
				state: 'TAS',
				price: 56.45,
				generation: 18256,
				renewable: 45,
				intensity: 420
			}
		],
		notes: [
			'12 Month rolling average. Updated every day.',
			'*WA has a capacity market - prices cannot be compared with east coast.'
		]
	};

	const live = {
		dispatch: `${isToday(dispatchTime) ? 'Today ' : ''}${format(dispatchTime, 'HH:mmaaa xxx')}`,
		columns: [
			{ id: 'state', label: '', unit: '' },
			{ id: 'price', label: 'Price', unit: '' },
			{ id: 'energy', label: 'Generation', unit: 'MW' },
			{ id: 'renewable', label: 'Renewable', unit: '%' }
		],
		rows: [
			{
				state: 'WA',
				price: 56.45,
				energy: 18256,
				renewable: 45
			},
			{
				state: 'QLD',
				price: 56.45,
				energy: 18256,
				renewable: 45
			},
			{
				state: 'NSW',
				price: 56.45,
				energy: 18256,
				renewable: 45
			},
			{
				state: 'SA',
				price: 56.45,
				energy: 18256,
				renewable: 45
			},
			{
				state: 'VIC',
				price: 56.45,
				energy: 18256,
				renewable: 45
			},
			{
				state: 'TAS',
				price: 56.45,
				energy: 18256,
				renewable: 45
			}
		],
		flows,
		notes: [
			'*WA data is based on WA Dispatch time. WA has a capacity market - prices cannot be compared with other states.'
		]
	};

	if (homepageData && homepageData.length > 0) {
		return {
			...homepageData[0],
			articles,
			records,
			annual,
			live
		};
	}

	throw error(404, 'Not found');
}
