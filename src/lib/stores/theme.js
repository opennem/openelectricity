import { scaleLinear } from 'd3-scale';
import { derived, writable } from 'svelte/store';

import {
	fuelTechColourMap as OpenNemFtColours,
	carbonIntensityColourMap as OpenNemCarbonIntensityColours
} from '$lib/theme/opennem';
import {
	fuelTechColourMap as OpenElectricityFtColours,
	carbonIntensityColourMap as OpenElectricityCarbonIntensityColours
} from '$lib/theme/openelectricity';

export const showThemeSwitcher = writable(false);

/** @type {import('svelte/store').Writable<'opennem' | 'openelectricity'>} */
export const theme = writable('openelectricity');

export const fuelTechColourMap = derived(theme, ($theme) => {
	return $theme === 'opennem' ? OpenNemFtColours : OpenElectricityFtColours;
});

export const carbonIntensityColourMap = derived(theme, ($theme) => {
	return $theme === 'opennem'
		? OpenNemCarbonIntensityColours
		: OpenElectricityCarbonIntensityColours;
});

export const fuelTechColour = derived(fuelTechColourMap, ($fuelTechColourMap) => {
	return (/** @type {FuelTechCode} */ fuelTechCode) => {
		return $fuelTechColourMap[fuelTechCode];
	};
});

export const colourReducer = derived(fuelTechColourMap, ($fuelTechColourMap) => {
	return (/** @type {Object.<string, string>} */ acc, /** @type {StatsData} **/ d) => {
		acc[d.id] = d.fuel_tech ? $fuelTechColourMap[d.fuel_tech] : '';
		return acc;
	};
});

export const carbonIntensityColour = derived(
	carbonIntensityColourMap,
	($carbonIntensityColourMap) => {
		return scaleLinear(
			Object.keys($carbonIntensityColourMap).map(Number),
			Object.values($carbonIntensityColourMap)
		);
	}
);

export const carbonIntensityStops = derived(
	carbonIntensityColourMap,
	($carbonIntensityColourMap) => {
		const keys = Object.keys($carbonIntensityColourMap).map(Number);
		const stops = [];
		const max = keys[keys.length - 1];
		Object.keys($carbonIntensityColourMap)
			.map(Number)
			.forEach((ci) => {
				stops.push({
					offset: `${(ci / max) * 100}%`,
					color: $carbonIntensityColourMap[ci]
				});
			});

		return stops;
	}
);
