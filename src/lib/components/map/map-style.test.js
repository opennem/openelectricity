import { describe, expect, it } from 'vitest';
import {
	FACILITIES_MAP_THEMES,
	MAP_THEMES,
	isLightMapTheme,
	mapStyleForTheme
} from './map-style.js';

describe('map themes', () => {
	it('keeps Voyager specific to the facilities theme validator', () => {
		expect(MAP_THEMES).toEqual(['light', 'dark', 'satellite']);
		expect(FACILITIES_MAP_THEMES).toEqual(['voyager', ...MAP_THEMES]);
	});

	it('classifies the light-toned themes', () => {
		expect(isLightMapTheme('light')).toBe(true);
		expect(isLightMapTheme('voyager')).toBe(true);
		expect(isLightMapTheme('dark')).toBe(false);
		expect(isLightMapTheme('satellite')).toBe(false);
	});

	it('resolves each theme to its local style', () => {
		expect(mapStyleForTheme('voyager')).toBe('/map-styles/voyager.json');
		expect(mapStyleForTheme('light')).toBe('/map-styles/positron.json');
		expect(mapStyleForTheme('dark')).toBe('/map-styles/dark-matter.json');
		expect(mapStyleForTheme('satellite')).toBe('/map-styles/satellite.json');
	});
});
