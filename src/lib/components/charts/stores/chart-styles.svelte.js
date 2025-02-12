import getSeqId from '$lib/utils/html-id-gen';

export default class ChartStylesState {
	/** @type {boolean} */
	snapXTicks = $state(false);
	/** @type {string} */
	strokeWidth = $state('2px');
	/** @type {string} */
	strokeArray = $state('4');
	/** @type {string} */
	xTextAnchorPosition = $state('middle');

	/** @type {boolean} */
	showLineArea = $state(false);
	/** @type {boolean} */
	showLineDots = $state(false);
	/** @type {string} */
	lineColour = $state('#777');
	/** @type {string} */
	dotStrokeWidth = $state('1px');
	/** @type {string} */
	dotStroke = $state('#777');
	/** @type {string} */
	dotFill = $state('white');
	/** @type {number} */
	dotRadius = $state(3);

	/** @type {boolean} */
	showFocusDot = $state(false);

	/** @type {boolean} */
	xGridlines = $state(true);

	/** @type {string} */
	yAxisStroke = $state('#33333344');

	/** @type {string} */
	xAxisStroke = $state('#33333344');

	// Chart overlay
	/** @type {{ xStartValue: Date, xEndValue: Date } | undefined} */
	chartOverlay = $state();
	/** @type {{ date: Date } | undefined} */
	chartOverlayLine = $state();
	/** @type {string} */
	chartOverlayHatchStroke = $state('rgba(236, 233, 230, 0.4)');

	/** @type {string} */
	chartHeightClasses = $state('h-[400px] md:h-[450px]');

	/** @type {Object.<string, number>} */
	chartPadding = $state({ top: 0, right: 0, bottom: 40, left: 0 });

	/** @type {boolean} */
	chartClip = $state(true);

	// This is used to generate unique ids for the chart elements - for clip paths.
	/** @type {string} */
	htmlId = getSeqId();
}
