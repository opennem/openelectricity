export default class ChartStylesState {
	/** @type {boolean} */
	snapXTicks = $state(false);
	/** @type {string} */
	strokeWidth = $state('2px');
	/** @type {string} */
	strokeArray = $state('4');

	/** @type {boolean} */
	showLineArea = $state(true);
	/** @type {string} */
	lineColour = $state('rgba(0, 0, 0, 0.7)');
	/** @type {string} */
	dotStroke = $state('rgba(0, 0, 0, 0.7)');
	/** @type {string} */
	dotFill = $state('white');

	// Chart overlay
	/** @type {{ xStartValue: Date, xEndValue: Date } | undefined} */
	chartOverlay = $state();
	/** @type {{ date: Date } | undefined} */
	chartOverlayLine = $state();
	/** @type {string} */
	chartOverlayHatchStroke = $state('rgba(236, 233, 230, 0.4)');

	/** @type {string} */
	chartHeightClasses = $state('h-[400px] md:h-[450px]');
}
