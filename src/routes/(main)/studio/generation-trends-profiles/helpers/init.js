import { setContext, getContext } from 'svelte';
import ChartStore from '$lib/components/charts/stores/chart.svelte.js';
import { chartCxtsOptions } from './config';

/**
 * Initialize chart contexts for generation trends profiles
 * @param {any} data - The data from the page load
 */
export default function (data) {
	// Setup Chart contexts - one for each fuel tech that will have charts
	const fuelTechNames = data?.order || [];
	const chartCxts = {};

	fuelTechNames.forEach((fuelTech) => {
		const contextKey = Symbol(`generation-trends-${fuelTech}`);
		const options = {
			...chartCxtsOptions['generation-trends-chart'],
			key: contextKey,
			title: `${fuelTech.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())} Generation Profile`
		};
		
		setContext(contextKey, new ChartStore(options));
		chartCxts[fuelTech] = getContext(contextKey);
	});

	// Create a combined chart context for all fuel technologies
	const combinedContextKey = Symbol('combined-generation-trends');
	const combinedOptions = {
		...chartCxtsOptions['combined-generation-trends'],
		key: combinedContextKey
	};
	
	setContext(combinedContextKey, new ChartStore(combinedOptions));
	chartCxts['combined'] = getContext(combinedContextKey);

	// Create a cumulative chart context for all fuel technologies
	const cumulativeContextKey = Symbol('cumulative-generation-trends');
	const cumulativeOptions = {
		...chartCxtsOptions['cumulative-generation-trends'],
		key: cumulativeContextKey
	};
	
	setContext(cumulativeContextKey, new ChartStore(cumulativeOptions));
	chartCxts['cumulative'] = getContext(cumulativeContextKey);

	return {
		chartCxts
	};
}