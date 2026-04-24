import { getContext, setContext } from 'svelte';

const KEY = Symbol('facility-financial-data');

/**
 * Context shape exposed by `FacilityFinancialDataProvider`. Consumers read the
 * getter properties inside their own `$derived` / render blocks so reactivity
 * flows through from the provider's state.
 *
 * @typedef {Object} FacilityFinancialDataContextValue
 * @property {import('$lib/components/charts/v2/ChartStore.svelte.js').default | null} priceChartStore
 * @property {import('$lib/components/charts/v2/ChartStore.svelte.js').default | null} mvChartStore
 * @property {any[]} priceLoadingRanges
 * @property {any[]} mvLoadingRanges
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
 * @property {(event: WheelEvent) => void} handleWheel
 * @property {(chart: import('$lib/components/charts/v2/ChartStore.svelte.js').default) => {
 *   data: any,
 *   key: string | undefined,
 *   value: number | undefined,
 *   total: number,
 *   label: string | undefined,
 *   colour: string | undefined,
 *   date: string
 * } | null} getTooltipData
 * @property {(value: number) => string} formatPriceValue
 * @property {(chart: import('$lib/components/charts/v2/ChartStore.svelte.js').default, value: number) => string} formatDollarValue
 */

/**
 * @param {FacilityFinancialDataContextValue} value
 */
export function setFacilityFinancialDataContext(value) {
	setContext(KEY, value);
}

/**
 * @returns {FacilityFinancialDataContextValue | undefined}
 */
export function getFacilityFinancialDataContext() {
	return getContext(KEY);
}
