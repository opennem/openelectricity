import { PUBLIC_FLOWS_API, PUBLIC_EMISSIONS_API, PUBLIC_PRICE_API } from '$env/static/public';
import { format, isToday } from 'date-fns';

const DISPATCH_CACHE_T = 60 * 5 * 1000;

/**
 * @type {number | null}
 */
export let dispatchTime = null;
let energyDataStore = null;

export const energyData = async () => {
	// TODO: this doesn't work as expected, need to fix.
	// If we have a valid previous dispatch time and cached data,
	// and the dispatch time is less than the cache expiry time, return the cache
	if (energyDataStore && dispatchTime && Date.now() - dispatchTime < DISPATCH_CACHE_T) {
		energyDataStore.cached = true;
		return energyDataStore;
	}

	const originalJsons = {};

	// Fetch live flows data from API
	const flowsResponse = await fetch(`${PUBLIC_FLOWS_API}/nem`);
	const flows = {};

	if (flowsResponse.ok) {
		originalJsons.flows = await flowsResponse.json();
		/**
		 * get each region's flow latest flow data and dispatch time
		 */
		dispatchTime = Date.parse(originalJsons.flows.data[0].history.last);
		originalJsons.flows.data.forEach((region) => {
			flows[region.code] = region.history.data[region.history.data.length - 1];
			return true;
		});
	}

	// Fetch live emissions data from API
	let priceResponse = await fetch(`${PUBLIC_PRICE_API}/nem`);
	const prices = {};

	if (priceResponse.ok) {
		originalJsons.prices = await priceResponse.json();

		/**
		 * get each region's flow latest price data
		 */
		originalJsons.prices.data.every((region) => {
			prices[region.code] = region.history.data[region.history.data.length - 1];
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
				intensity: Math.round(100 + Math.random() * 400)
			},
			{
				state: 'QLD',
				price: 56.45,
				generation: 18256,
				renewable: 45,
				intensity: Math.round(100 + Math.random() * 400)
			},
			{
				state: 'NSW',
				price: 56.45,
				generation: 18256,
				renewable: 45,
				intensity: Math.round(100 + Math.random() * 400)
			},
			{
				state: 'SA',
				price: 56.45,
				generation: 18256,
				renewable: 45,
				intensity: Math.round(100 + Math.random() * 400)
			},
			{
				state: 'VIC',
				price: 56.45,
				generation: 18256,
				renewable: 45,
				intensity: Math.round(100 + Math.random() * 400)
			},
			{
				state: 'TAS',
				price: 56.45,
				generation: 18256,
				renewable: 45,
				intensity: Math.round(100 + Math.random() * 400)
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
				// price: 56.45,
				price: Math.round(Math.random() * 1000),
				energy: 18256,
				renewable: 45
			},
			{
				state: 'QLD',
				// price: prices.QLD1,
				price: Math.round(Math.random() * 1000),
				energy: 18256,
				renewable: 45
			},
			{
				state: 'NSW',
				// price: prices.NSW1,
				price: Math.round(Math.random() * 1000),
				energy: 18256,
				renewable: 45
			},
			{
				state: 'SA',
				// price: prices.SA1,
				price: Math.round(Math.random() * 1000),
				energy: 18256,
				renewable: 45
			},
			{
				state: 'VIC',
				// price: prices.VIC1,
				price: Math.round(Math.random() * 1000),
				energy: 18256,
				renewable: 45
			},
			{
				state: 'TAS',
				// price: prices.TAS1,
				price: Math.round(Math.random() * 1000),
				energy: 18256,
				renewable: 45
			}
		],
		flows,
		notes: [
			'*WA data is based on WA Dispatch time. WA has a capacity market - prices cannot be compared with other states.'
		]
	};

	energyDataStore = {
		cached: false,
		annual,
		live,
		originalJsons
	};

	return energyDataStore;
};
