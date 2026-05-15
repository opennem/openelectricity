import { getContext, setContext } from 'svelte';

const KEY = Symbol('facility-emissions-data');

/**
 * Context shape exposed by `FacilityEmissionsDataProvider`. Consumers read the
 * getter properties inside their own `$derived` / render blocks so reactivity
 * flows through from the provider's state.
 *
 * @typedef {Object} FacilityEmissionsDataContextValue
 * @property {import('$lib/components/charts/v2/ChartStore.svelte.js').default | null} intensityChartStore
 * @property {import('$lib/components/charts/v2/ChartStore.svelte.js').default | null} emissionsVolumeChartStore
 * @property {any[]} intensityLoadingRanges
 * @property {any[]} emissionsVolumeLoadingRanges
 * @property {boolean} showLoadingOverlay
 * @property {string} timeZone
 * @property {number} viewStart
 * @property {number} viewEnd
 * @property {boolean} hasViewportHandler
 * @property {number | undefined} hoverTime
 * @property {((time: number | undefined) => void) | undefined} onhoverchange
 * @property {() => void} handlePanStart
 * @property {(deltaMs: number) => void} handlePan
 * @property {() => void} handlePanEnd
 * @property {(factor: number, centerMs: number) => void} handleZoom
 * @property {(chart: import('$lib/components/charts/v2/ChartStore.svelte.js').default) => {
 *   data: any,
 *   key: string | undefined,
 *   value: number | undefined,
 *   total: number,
 *   label: string | undefined,
 *   colour: string | undefined,
 *   date: string
 * } | null} getTooltipData
 * @property {(value: number) => string} formatIntensityValue
 * @property {(chart: import('$lib/components/charts/v2/ChartStore.svelte.js').default, value: number) => string} formatEmissionsValue
 */

/**
 * @param {FacilityEmissionsDataContextValue} value
 */
export function setFacilityEmissionsDataContext(value) {
	setContext(KEY, value);
}

/**
 * @returns {FacilityEmissionsDataContextValue | undefined}
 */
export function getFacilityEmissionsDataContext() {
	return getContext(KEY);
}
