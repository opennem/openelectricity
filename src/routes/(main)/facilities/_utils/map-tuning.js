/**
 * Visual constants for the Facilities map's marker styles. Single source of
 * truth for the live tuning panel and the prop defaults on Map / MapHexLayer.
 *
 * @typedef {{
 *   circleMin: number,
 *   circleMax: number,
 *   hexRadius: number,
 *   hexElevationScale: number,
 *   hexDiskResolution: number,
 *   hexBrightMix: number,
 *   hexFillAlpha: number,
 *   hexGlowRadiusMultiplier: number,
 *   hexGlowAlpha: number,
 *   hexOutlineAlpha: number,
 *   hexExtruded: boolean,
 *   hexMaterial: boolean,
 *   heatmapRadius: number,
 *   heatmapIntensity: number,
 *   heatmapThreshold: number,
 *   heatmapDebounce: number,
 *   heatmapTextureSize: number
 * }} Tuning
 */

/** @type {Tuning} */
export const DEFAULT_TUNING = {
	circleMin: 4,
	circleMax: 28,
	hexRadius: 6500,
	hexElevationScale: 200,
	hexDiskResolution: 6,
	hexBrightMix: 0.35,
	hexFillAlpha: 240,
	hexGlowRadiusMultiplier: 2.5,
	hexGlowAlpha: 60,
	hexOutlineAlpha: 220,
	hexExtruded: true,
	hexMaterial: false,
	heatmapRadius: 75,
	heatmapIntensity: 1.4,
	heatmapThreshold: 0.02,
	heatmapDebounce: 300,
	heatmapTextureSize: 512
};
