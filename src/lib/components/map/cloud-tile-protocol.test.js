import { describe, it, expect } from 'vitest';
import { cloudAlpha, parseCloudTileUrl, CLOUD_TILE_SCHEME } from './cloud-tile-protocol.js';

describe('cloudAlpha', () => {
	it('keeps clear-sky temperatures fully transparent', () => {
		expect(cloudAlpha(0)).toBe(0);
		expect(cloudAlpha(0.25)).toBe(0); // typical clear-sky land/sea
		expect(cloudAlpha(0.4)).toBe(0);
	});

	it('renders cold cloud tops fully opaque', () => {
		expect(cloudAlpha(0.85)).toBe(1);
		expect(cloudAlpha(1)).toBe(1);
	});

	it('ramps monotonically and stays clamped in between', () => {
		let prev = 0;
		for (let lum = 0; lum <= 1.0001; lum += 0.05) {
			const alpha = cloudAlpha(lum);
			expect(alpha).toBeGreaterThanOrEqual(prev);
			expect(alpha).toBeGreaterThanOrEqual(0);
			expect(alpha).toBeLessThanOrEqual(1);
			prev = alpha;
		}
	});
});

describe('parseCloudTileUrl', () => {
	const tile = 'https://gibs.example/tiles/3/4/6.png';

	it('splits the style segment from the real tile URL', () => {
		expect(parseCloudTileUrl(`${CLOUD_TILE_SCHEME}://white/${tile}`)).toEqual({
			style: 'white',
			url: tile
		});
		expect(parseCloudTileUrl(`${CLOUD_TILE_SCHEME}://shaded/${tile}`)).toEqual({
			style: 'shaded',
			url: tile
		});
	});

	it('falls back to shaded for unknown styles', () => {
		expect(parseCloudTileUrl(`${CLOUD_TILE_SCHEME}://mystery/${tile}`).style).toBe('shaded');
	});

	it('rejects malformed protocol URLs', () => {
		expect(() => parseCloudTileUrl(tile)).toThrow('Invalid cloud tile URL');
		expect(() => parseCloudTileUrl(`${CLOUD_TILE_SCHEME}://white`)).toThrow(
			'Invalid cloud tile URL'
		);
	});
});
