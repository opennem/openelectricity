/**
 * derived-rate-recipe.js — type surface for `FacilityDerivedRateProvider`.
 *
 * The generic provider owns the shared machinery of the facility derived-rate
 * chart pairs (Price + Market Value, Intensity + Emissions Volume); everything
 * that differs between the pairs travels through a `DerivedRateRecipe` object
 * built once in each thin wrapper. The typedefs live in this plain module
 * because JSDoc typedefs declared inside a `.svelte` script are not importable
 * elsewhere (svelte2tsx does not export them).
 */

/** @typedef {import('$lib/components/charts/v2/ChartStore.svelte.js').default} ChartStore */

/**
 * Lazy inputs for `getRateSeries` — getters, so recipes with a fixed single
 * line never evaluate the underlying rate-side unit analysis.
 *
 * @typedef {Object} RateSeriesInputs
 * @property {boolean} hasLoadRateLine - Whether the rate unit set has a load side
 * @property {string[]} genFuelTechs - Fuel techs of the generation-side units
 * @property {string[]} loadFuelTechs - Fuel techs of the load-side units
 */

/**
 * Generic-shaped context handed to `recipe.setContext` — the wrapper maps it
 * onto its named context fields via forwarding getters so reactivity flows
 * through to consumers.
 *
 * @typedef {Object} DerivedRateContextValue
 * @property {ChartStore | null} rateChartStore
 * @property {ChartStore | null} volumeChartStore
 * @property {any[]} rateLoadingRanges
 * @property {any[]} volumeLoadingRanges
 * @property {boolean} showLoadingOverlay
 * @property {string} timeZone
 * @property {number} viewStart
 * @property {number} viewEnd
 * @property {boolean} hasViewportHandler
 * @property {number | undefined} hoverTime
 * @property {((time: number | undefined) => void) | undefined} onhoverchange
 * @property {number | undefined} focusTime
 * @property {((time: number | undefined) => void) | undefined} onfocuschange
 * @property {() => void} handlePanStart
 * @property {(deltaMs: number) => void} handlePan
 * @property {() => void} handlePanEnd
 * @property {(factor: number, centerMs: number) => void} handleZoom
 * @property {(chart: ChartStore) => {
 *   data: any,
 *   key: string | undefined,
 *   value: number | undefined,
 *   total: number,
 *   label: string | undefined,
 *   colour: string | undefined,
 *   date: string
 * } | null} getTooltipData
 */

/**
 * Everything that differs between the derived-rate providers. Built once as
 * a plain object in each wrapper — the factories and callbacks must capture
 * plain values only.
 *
 * @typedef {Object} DerivedRateRecipe
 * @property {string} volumeMetric - Metric the volume manager processes ('market_value', 'emissions')
 * @property {boolean} supportsRateSourceFacility - Enables the own rate-manager pair when
 *   `rateSourceFacility` supplies a different unit set (financial only)
 * @property {boolean} summaryRequiresBasis - Whether the summary payload needs the basis rows,
 *   the volume chart store and the energy conversion context
 * @property {(opts: { timeZone: string, heightClasses: string }) => ChartStore} createRateChart -
 *   Rate-line ChartStore factory (title, unit, y-scale, formatY)
 * @property {(opts: {
 *   timeZone: string,
 *   heightClasses: string,
 *   yTicks: number | Array<any> | ((ticks: any[]) => any[]) | undefined
 * }) => ChartStore} createVolumeChart - Stacked-volume ChartStore factory
 * @property {(inputs: RateSeriesInputs) => {
 *   seriesNames: string[],
 *   seriesColours: Record<string, string>,
 *   seriesLabels: Record<string, string>
 * }} getRateSeries - Series config for the rate-line chart
 * @property {(isEnergyInterval: boolean) => 'step' | 'straight'} getRateCurveType
 * @property {(opts: {
 *   volumeRows: any[],
 *   volumeSeriesNames: string[],
 *   basisRows: any[],
 *   basisSeriesNames: string[],
 *   basisMetric: 'power' | 'energy',
 *   loadCodes: string[],
 *   energyOpts: import('./energy-basis.js').BasisContext
 * }) => any[]} deriveRateRows - Pure rate derivation (see price-lines.js / intensity-lines.js)
 * @property {(opts: {
 *   volumeRows: any[],
 *   volumeSeriesNames: string[],
 *   basisRows: any[],
 *   basisSeriesNames: string[],
 *   volumeChartStore: ChartStore | null,
 *   energyOpts: import('./energy-basis.js').BasisContext | null
 * }) => any} buildSummaryPayload - Shapes the debounced `onsummarydata` payload
 * @property {(ctx: DerivedRateContextValue) => void} setContext - Publishes the wrapper's named
 *   context; called during component init so it binds to the generic provider's context chain
 */

export {};
