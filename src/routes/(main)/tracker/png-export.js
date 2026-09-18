import logo from '../../../../static/img/logo.svg?raw';

/** @typedef {{label: string, colour: string}} LegendItem */
/** @typedef {{id: string, label: string, ready: boolean, caption: string, title: string, unit: string,
 * transform: string, legend: LegendItem[], svg: string, width: number, height: number}} PngChart */
/** @typedef {{charts: PngChart[], generatedAt: string}} PngSnapshot */

const NS = 'http://www.w3.org/2000/svg';

/** Let short axis enter/exit transitions finish so snapshots do not retain both
 * old and new ticks. Never wait on loading spinners or paused animations.
 * @param {HTMLElement} root */
export async function settleChartAnimations(root) {
	const animations = root
		.getAnimations({ subtree: true })
		.filter(
			(animation) =>
				animation.playState === 'running' &&
				Number.isFinite(animation.effect?.getComputedTiming().endTime)
		);
	if (!animations.length) return;
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timer;
	try {
		await Promise.race([
			Promise.all(animations.map((animation) => animation.finished.catch(() => {}))),
			new Promise((resolve) => {
				timer = setTimeout(resolve, 1000);
			})
		]);
	} finally {
		clearTimeout(timer);
	}
}

const STYLE_PROPERTIES = [
	'fill',
	'fill-opacity',
	'fill-rule',
	'stroke',
	'stroke-width',
	'stroke-opacity',
	'stroke-dasharray',
	'stroke-dashoffset',
	'stroke-linecap',
	'stroke-linejoin',
	'opacity',
	'font-size',
	'font-weight',
	'font-style',
	'letter-spacing',
	'text-anchor',
	'dominant-baseline',
	'alignment-baseline',
	'paint-order',
	'visibility',
	'display',
	'clip-path',
	'mask',
	'vector-effect',
	'shape-rendering',
	'overflow'
];

/** Preserve rendered CSS without copying interactive DOM or external resources.
 * @param {Element} source @returns {SVGElement} */
function styledClone(source) {
	const clone = /** @type {SVGElement} */ (source.cloneNode(false));
	const computed = getComputedStyle(source);
	clone.removeAttribute('style');
	for (const property of STYLE_PROPERTIES) {
		// Browsers resolve fragment references against the page URL. The image is standalone.
		const value = computed
			.getPropertyValue(property)
			.replace(/url\(["']?[^)"']*#([^)'" ]+)["']?\)/g, 'url(#$1)');
		if (value) clone.style.setProperty(property, value);
	}
	clone.style.fontFamily = 'Arial, sans-serif';
	if (source.matches('.path-area, .path-line, .stacked-bar rect, .grouped-bar rect'))
		clone.style.opacity = '1';
	for (const child of Array.from(source.childNodes)) {
		if (child instanceof Element) {
			if (!child.matches('[data-png-exclude], script, foreignObject, image, use'))
				clone.append(styledClone(child));
		} else if (child.nodeType === Node.TEXT_NODE) clone.append(child.cloneNode());
	}
	return clone;
}

/** Layers an image is composed from: LayerCake's SVGs, or a chart that draws
 * its own SVG or canvas and marks it `data-png-layer` inside a
 * `data-chart-area` root. A canvas is embedded as a raster image. */
const PNG_LAYERS = 'svg.layercake-layout-svg, svg[data-png-layer], canvas[data-png-layer]';

/** A canvas layer as an SVG image, or null where the raster cannot be read.
 * @param {HTMLCanvasElement} canvas */
function rasterLayer(canvas) {
	try {
		const image = document.createElementNS(NS, 'image');
		image.setAttribute('href', canvas.toDataURL('image/png'));
		image.setAttribute('preserveAspectRatio', 'none');
		return image;
	} catch {
		return null;
	}
}

/** Capture every SVG layer in its rendered position, including axes.
 * @param {Element} chart */
export function captureChartSvg(chart) {
	const area = chart.querySelector('.stratum-chart-area, [data-chart-area]');
	if (!area) throw new Error('The chart has not rendered yet. Close the export and try again.');
	const bounds = area.getBoundingClientRect();
	if (bounds.width < 1 || bounds.height < 1) throw new Error('The chart has no visible size.');
	const root = document.createElementNS(NS, 'svg');
	root.setAttribute('width', String(bounds.width));
	root.setAttribute('height', String(bounds.height));
	root.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
	const layers = area.querySelectorAll(PNG_LAYERS);
	if (!layers.length) throw new Error('The chart has not rendered yet.');
	for (const layer of Array.from(layers)) {
		const rect = layer.getBoundingClientRect();
		const clone = layer instanceof HTMLCanvasElement ? rasterLayer(layer) : styledClone(layer);
		if (!clone) continue;
		clone.setAttribute('x', String(rect.left - bounds.left));
		clone.setAttribute('y', String(rect.top - bounds.top));
		clone.setAttribute('width', String(rect.width));
		clone.setAttribute('height', String(rect.height));
		root.append(clone);
	}
	return {
		svg: new XMLSerializer().serializeToString(root),
		width: bounds.width,
		height: bounds.height
	};
}

/** Freeze metadata and geometry together, before any asynchronous image work.
 * @param {HTMLElement} root @returns {PngSnapshot} */
export function capturePngSnapshot(root) {
	const charts = Array.from(root.querySelectorAll('[data-tracker-png]'), (element) => {
		const eligibility = JSON.parse(element.getAttribute('data-tracker-png') || '{}');
		const chart = element.querySelector('[data-chart-image]');
		const metadata = JSON.parse(chart?.getAttribute('data-chart-image') || '{}');
		const context = element.closest('[data-png-context]')?.getAttribute('data-png-context');
		const ready = !!eligibility.ready && !!metadata.hasData && !!chart?.querySelector(PNG_LAYERS);
		return {
			...metadata,
			...eligibility,
			ready,
			caption: [context, eligibility.caption, metadata.transform].filter(Boolean).join(' · '),
			...(ready && chart ? captureChartSvg(chart) : { svg: '', width: 0, height: 0 })
		};
	});
	return { charts, generatedAt: new Date().toISOString() };
}

/** Wrap arbitrary user text, including long unbroken tokens, without truncation.
 * @param {string} text @param {number} width @param {(text: string) => number} measure */
export function wrapText(text, width, measure) {
	const lines = [];
	for (const paragraph of text.split('\n')) {
		let line = '';
		for (const word of paragraph.split(/\s+/).filter(Boolean)) {
			const candidate = line ? `${line} ${word}` : word;
			if (measure(candidate) <= width) {
				line = candidate;
				continue;
			}
			if (line) {
				lines.push(line);
				line = '';
			}
			for (const character of word) {
				if (line && measure(line + character) > width) {
					lines.push(line);
					line = '';
				}
				line += character;
			}
		}
		lines.push(line);
	}
	return lines;
}

/** @param {number} width @param {number} height */
export function pngDimensions(width, height) {
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
		throw new Error('Invalid image dimensions.');
	const scale = Math.min(2, 8192 / width, 8192 / height, Math.sqrt(24_000_000 / (width * height)));
	return { width: Math.ceil(width * scale), height: Math.ceil(height * scale), scale };
}

/** @param {string} svg @returns {Promise<HTMLImageElement>} */
function loadSvg(svg) {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Unable to render the chart image. Please try again.'));
		};
		img.src = url;
	});
}

/** Render one immutable snapshot. The downloaded blob is exactly the preview.
 * @param {PngSnapshot} snapshot @param {{selected: string[], title: string, description: string}} options
 * @returns {Promise<Blob>} */
export async function renderPng(snapshot, { selected, title, description }) {
	const charts = snapshot.charts.filter((chart) => chart.ready && selected.includes(chart.id));
	if (!charts.length) throw new Error('Select at least one ready chart.');
	const width = Math.max(640, Math.min(1280, Math.max(...charts.map((chart) => chart.width)) + 64));
	const contentWidth = width - 64;
	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d');
	if (!context) throw new Error('PNG export is not supported by this browser.');
	const ctx = context;
	const [brand, ...images] = await Promise.all([
		loadSvg(logo),
		...charts.map((chart) => loadSvg(chart.svg))
	]);
	/** @type {Array<() => void>} */
	const draw = [];
	let y = 32;
	draw.push(() => ctx.drawImage(brand, 32, 32, 236, 28));
	y += 56;
	/** @param {string} value @param {number} size @param {string} colour @param {boolean} [bold] */
	function text(value, size, colour, bold = false) {
		if (!value.trim()) return;
		const font = `${bold ? '600' : '400'} ${size}px Arial, sans-serif`;
		ctx.font = font;
		for (const line of wrapText(value, contentWidth, (value) => ctx.measureText(value).width)) {
			const top = y;
			draw.push(() => {
				ctx.font = font;
				ctx.fillStyle = colour;
				ctx.fillText(line, 32, top);
			});
			y += Math.ceil(size * 1.45);
		}
		y += 8;
	}
	text(title.slice(0, 140) || 'Electricity tracker', 28, '#252525', true);
	text(description.slice(0, 600), 15, '#555');
	charts.forEach((chart, index) => {
		y += 20;
		text(
			`${chart.title || chart.label}${chart.unit ? ` (${chart.unit})` : ''}`,
			19,
			'#252525',
			true
		);
		text(chart.caption, 12, '#555');
		const imageHeight = (chart.height * contentWidth) / chart.width;
		const top = y;
		draw.push(() => ctx.drawImage(images[index], 32, top, contentWidth, imageHeight));
		y += imageHeight + 16;
		// Flow complete legend labels across rows; long labels get their own wrapped row.
		ctx.font = '400 12px Arial, sans-serif';
		let x = 32;
		for (const item of chart.legend) {
			const lines = wrapText(
				item.label,
				contentWidth - 24,
				(value) => ctx.measureText(value).width
			);
			const itemWidth = Math.max(...lines.map((line) => ctx.measureText(line).width)) + 36;
			if (x > 32 && x + itemWidth > width - 32) {
				x = 32;
				y += 24;
			}
			const left = x,
				top = y;
			draw.push(() => {
				ctx.fillStyle = item.colour;
				ctx.fillRect(left, top + 2, 10, 10);
				ctx.fillStyle = '#454545';
				ctx.font = '400 12px Arial, sans-serif';
				lines.forEach((line, i) => ctx.fillText(line, left + 17, top + i * 18));
			});
			x += itemWidth;
			if (lines.length > 1) {
				x = 32;
				y += lines.length * 18 + 6;
			}
		}
		y += 32;
	});
	y += 12;
	text('Source: Open Electricity · openelectricity.org.au/tracker', 12, '#555');
	text(
		`Generated ${snapshot.generatedAt.replace('T', ' ').replace(/\.\d+Z$/, ' UTC')}`,
		11,
		'#666'
	);
	const dimensions = pngDimensions(width, y + 24);
	canvas.width = dimensions.width;
	canvas.height = dimensions.height;
	ctx.scale(dimensions.scale, dimensions.scale);
	ctx.fillStyle = '#fff';
	ctx.fillRect(0, 0, width, y + 24);
	ctx.textBaseline = 'top';
	for (const paint of draw) paint();
	return new Promise((resolve, reject) =>
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('Unable to create the PNG file.'))),
			'image/png'
		)
	);
}
