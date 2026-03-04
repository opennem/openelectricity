/**
 * Export utilities for Stratify charts.
 * Captures the rendered chart as SVG or PNG for download.
 */

/**
 * Capture the chart SVG from the DOM, inline styles, and return as a string.
 * @param {HTMLElement} container - The .chart-preview element containing the SVG
 * @returns {string | null} Complete SVG markup, or null if no SVG found
 */
export function captureSVG(container) {
	const svg = container.querySelector('svg');
	if (!svg) return null;

	const clone = /** @type {SVGSVGElement} */ (svg.cloneNode(true));

	// Ensure the clone has explicit width/height
	const rect = svg.getBoundingClientRect();
	clone.setAttribute('width', String(rect.width));
	clone.setAttribute('height', String(rect.height));
	clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

	// Inline computed styles on all elements
	inlineStyles(svg, clone);

	return new XMLSerializer().serializeToString(clone);
}

/**
 * Recursively inline computed styles from source to clone elements.
 * @param {Element} source
 * @param {Element} clone
 */
function inlineStyles(source, clone) {
	const computed = window.getComputedStyle(source);
	const important = [
		'fill',
		'stroke',
		'stroke-width',
		'stroke-dasharray',
		'opacity',
		'font-family',
		'font-size',
		'font-weight',
		'text-anchor',
		'dominant-baseline',
		'color'
	];

	for (const prop of important) {
		const value = computed.getPropertyValue(prop);
		if (value) {
			/** @type {HTMLElement} */ (clone).style.setProperty(prop, value);
		}
	}

	const sourceChildren = source.children;
	const cloneChildren = clone.children;

	for (let i = 0; i < sourceChildren.length && i < cloneChildren.length; i++) {
		inlineStyles(sourceChildren[i], cloneChildren[i]);
	}
}

/**
 * Download an SVG string as a file.
 * @param {string} svgString
 * @param {string} [filename]
 */
export function downloadSVG(svgString, filename = 'chart.svg') {
	const blob = new Blob([svgString], { type: 'image/svg+xml' });
	downloadBlob(blob, filename);
}

/**
 * Render the chart SVG to a PNG and download it.
 * @param {HTMLElement} container - The .chart-preview element
 * @param {string} [filename]
 * @param {number} [scale] - Pixel density multiplier (default 2 for retina)
 * @returns {Promise<void>}
 */
export async function downloadPNG(container, filename = 'chart.png', scale = 2) {
	const svgString = captureSVG(container);
	if (!svgString) return;

	const svg = container.querySelector('svg');
	if (!svg) return;

	const rect = svg.getBoundingClientRect();
	const width = rect.width * scale;
	const height = rect.height * scale;

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	// White background
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, width, height);

	const img = new Image();
	const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
	const url = URL.createObjectURL(blob);

	return new Promise((resolve) => {
		img.onload = () => {
			ctx.drawImage(img, 0, 0, width, height);
			URL.revokeObjectURL(url);

			canvas.toBlob((pngBlob) => {
				if (pngBlob) downloadBlob(pngBlob, filename);
				resolve();
			}, 'image/png');
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			resolve();
		};

		img.src = url;
	});
}

/**
 * Download a blob as a file.
 * @param {Blob} blob
 * @param {string} filename
 */
function downloadBlob(blob, filename) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
