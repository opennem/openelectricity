/**
 * Chart Styles Store
 *
 * Manages visual styling configuration for charts including:
 * - Dimensions and padding
 * - Axis styling
 * - Line/area styling
 * - Focus/hover visual states
 */

import getSeqId from '$lib/utils/html-id-gen';

/**
 * @typedef {Object} ChartPadding
 * @property {number} top
 * @property {number} right
 * @property {number} bottom
 * @property {number} left
 */

/**
 * @typedef {Object} ChartStylesConfig
 * @property {string} [chartHeightClasses]
 * @property {ChartPadding} [chartPadding]
 * @property {string} [xAxisFill]
 * @property {string} [xTextClasses]
 * @property {number} [xAxisYTick]
 * @property {boolean} [showLastYTick]
 * @property {boolean} [xGridlines]
 */

export default class ChartStyles {
	// Unique ID for clip paths and other DOM elements
	/** @type {string} */
	htmlId = getSeqId();

	// Chart dimensions
	/** @type {string} */
	chartHeightClasses = $state('h-[400px] md:h-[450px]');

	/** @type {ChartPadding} */
	chartPadding = $state({ top: 0, right: 0, bottom: 40, left: 0 });

	// X-axis styling
	/** @type {string} */
	xAxisFill = $state('white');

	/** @type {string} */
	xAxisStroke = $state('#33333344');

	/** @type {string} */
	xTextClasses = $state('text-xxs font-light text-mid-warm-grey');

	/** @type {string} */
	xTextAnchorPosition = $state('middle');

	/** @type {number} */
	xAxisYTick = $state(16);

	/** @type {boolean} */
	xGridlines = $state(true);

	// Y-axis styling
	/** @type {string} */
	yAxisStroke = $state('#33333344');

	/** @type {boolean} */
	showLastYTick = $state(true);

	/** @type {string} */
	zeroValueStroke = $state('#33333344');

	// Line chart styling
	/** @type {string} */
	strokeWidth = $state('2px');

	/** @type {string} */
	strokeArray = $state('4');

	/** @type {boolean} */
	showLineArea = $state(false);

	/** @type {string} */
	lineColour = $state('#777');

	// Dot styling
	/** @type {boolean} */
	showLineDots = $state(false);

	/** @type {number} */
	dotRadius = $state(3);

	/** @type {string} */
	dotStroke = $state('#777');

	/** @type {string} */
	dotStrokeWidth = $state('1px');

	/** @type {string} */
	dotFill = $state('white');

	/** @type {number} */
	dotOpacity = $state(0.3);

	// Focus state styling
	/** @type {boolean} */
	showFocusDot = $state(false);

	/** @type {boolean} */
	showFocusYLine = $state(false);

	/** @type {string} */
	focusYLineStrokeColour = $state('#C7452399');

	/** @type {string} */
	focusYLineDotColour = $state('#C74523');

	/** @type {string | null} */
	focusYLineDotBorderColour = $state(null);

	/** @type {number} */
	focusYLineDotRadius = $state(5);

	// Hover state styling
	/** @type {boolean} */
	showHoverDot = $state(false);

	/** @type {boolean} */
	showHoverYLine = $state(false);

	// Chart overlay
	/** @type {{ xStartValue: Date, xEndValue: Date } | undefined} */
	chartOverlay = $state();

	/** @type {{ date: Date } | undefined} */
	chartOverlayLine = $state();

	/** @type {string} */
	chartOverlayHatchStroke = $state('rgba(236, 233, 230, 0.4)');

	/** @type {boolean} */
	chartClip = $state(true);

	/**
	 * @param {Partial<ChartStylesConfig>} [config]
	 */
	constructor(config = {}) {
		if (config.chartHeightClasses) this.chartHeightClasses = config.chartHeightClasses;
		if (config.chartPadding) this.chartPadding = config.chartPadding;
		if (config.xAxisFill) this.xAxisFill = config.xAxisFill;
		if (config.xTextClasses) this.xTextClasses = config.xTextClasses;
		if (config.xAxisYTick !== undefined) this.xAxisYTick = config.xAxisYTick;
		if (config.showLastYTick !== undefined) this.showLastYTick = config.showLastYTick;
		if (config.xGridlines !== undefined) this.xGridlines = config.xGridlines;
	}
}
