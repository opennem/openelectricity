/**
 * Chart v2 Type Definitions
 *
 * JSDoc types for the v2 chart system.
 * These types provide better IDE support and documentation.
 */

/**
 * Time series data point with dynamic properties for each series
 * @typedef {Object} TimeSeriesDataPoint
 * @property {number} time - Unix timestamp in milliseconds
 * @property {Date} date - JavaScript Date object
 * @property {number} [_max] - Calculated maximum value (for stacked charts)
 * @property {number} [_min] - Calculated minimum value (for stacked charts)
 */

/**
 * Time series data record with dynamic series values
 * This is the primary data type used throughout the chart system
 * @typedef {Object} TimeSeriesData
 * @property {number} time - Unix timestamp in milliseconds
 * @property {Date} date - JavaScript Date object
 * @property {number} [_max] - Calculated maximum (sum of positive values)
 * @property {number} [_min] - Calculated minimum (sum of negative values)
 */

/**
 * Configuration for initializing a chart
 * @typedef {Object} ChartConfig
 * @property {symbol} key - Unique identifier for the chart instance
 * @property {string} [title] - Chart title displayed in header
 * @property {SiPrefix} [prefix] - SI prefix for data values (e.g., 'M', 'G')
 * @property {SiPrefix} [displayPrefix] - SI prefix for display (can differ from data prefix)
 * @property {SiPrefix[]} [allowedPrefixes] - Allowed prefix options for user switching
 * @property {string} [baseUnit] - Base unit (e.g., 'W', 'Wh')
 * @property {ChartType} [chartType] - Initial chart type ('area' or 'line')
 * @property {string} [timeZone] - IANA timezone string (default: 'Australia/Sydney')
 * @property {boolean} [hideDataOptions] - Hide data transform options in UI
 * @property {boolean} [hideChartTypeOptions] - Hide chart type selector in UI
 * @property {ChartStylesConfig} [styles] - Custom style overrides
 */

/**
 * Chart type options
 * @typedef {'area' | 'line'} ChartType
 */

/**
 * Data transformation type
 * @typedef {'absolute' | 'proportion' | 'changeSince'} DataTransformType
 */

/**
 * Curve interpolation type
 * @typedef {'smooth' | 'straight' | 'step'} CurveType
 */

/**
 * SI prefix for unit conversion
 * @typedef {'' | 'k' | 'M' | 'G' | 'T' | 'P'} SiPrefix
 */

/**
 * Series configuration for a chart
 * @typedef {Object} SeriesConfig
 * @property {string[]} names - Series identifiers/keys
 * @property {Record<string, string>} colours - Map of series name to colour
 * @property {Record<string, string>} labels - Map of series name to display label
 */

/**
 * Chart styles configuration
 * @typedef {Object} ChartStylesConfig
 * @property {string} [chartHeightClasses] - Tailwind height classes
 * @property {string} [xAxisFill] - X-axis background fill colour
 * @property {boolean} [showLastYTick] - Whether to show the last Y-axis tick
 * @property {ChartPadding} [chartPadding] - Chart padding configuration
 * @property {number} [xAxisYTick] - X-axis Y offset for ticks
 * @property {string} [xTextClasses] - CSS classes for x-axis text
 */

/**
 * Chart padding configuration
 * @typedef {Object} ChartPadding
 * @property {number} top - Top padding in pixels
 * @property {number} right - Right padding in pixels
 * @property {number} bottom - Bottom padding in pixels
 * @property {number} left - Left padding in pixels
 */

/**
 * Hover/focus state for a data point
 * @typedef {Object} InteractionState
 * @property {number} [time] - Timestamp of hovered/focused point
 * @property {string} [key] - Key/name of hovered series
 */

/**
 * Chart domain configuration
 * @typedef {Object} DomainConfig
 * @property {[number, number] | [Date, Date]} [x] - X-axis domain [min, max]
 * @property {[number, number]} [y] - Y-axis domain [min, max]
 */

/**
 * Tick configuration for axes
 * @typedef {Object} TickConfig
 * @property {Date[] | number[] | number} [x] - X-axis ticks (array or count)
 * @property {number[] | number} [y] - Y-axis ticks (array or count)
 */

/**
 * Data transform function signature
 * @callback DataTransformFunction
 * @param {Object} params
 * @param {TimeSeriesDataPoint} params.datapoint - The data point to transform
 * @param {TimeSeriesDataPoint[]} [params.dataset] - Full dataset for context
 * @param {string[]} [params.domains] - Series names to include
 * @returns {TimeSeriesDataPoint} Transformed data point
 */

/**
 * Format function for axis ticks
 * @callback TickFormatter
 * @param {Date | number} value - The tick value
 * @param {string} [timeZone] - Optional timezone for date formatting
 * @returns {string} Formatted tick label
 */

/**
 * Format function for values
 * @callback ValueFormatter
 * @param {number} value - The value to format
 * @returns {string} Formatted value string
 */

// Export empty object to make this a module
export {};
