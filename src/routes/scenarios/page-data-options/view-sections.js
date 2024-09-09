import IconByTechnology from '$lib/icons/custom/ByTechnology.svelte';
import IconByScenario from '$lib/icons/custom/ByScenario.svelte';
import IconByRegion from '$lib/icons/custom/ByRegion.svelte';

/** @type {ScenarioViewSectionOption[]} */
export const viewSectionOptions = [
	{
		value: 'technology',
		label: 'By Technology',
		icon: IconByTechnology,
		size: 'size-6'
	},
	{
		value: 'scenario',
		label: 'By Scenario',
		icon: IconByScenario,
		size: 'size-6'
	},
	{
		value: 'region',
		label: 'By Region',
		icon: IconByRegion,
		size: 'size-7'
	}
];
