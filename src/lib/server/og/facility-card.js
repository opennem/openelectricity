/**
 * Facility Open Graph card renderer (build-time only).
 *
 * Composes a 1200×630 social card per facility with satori (layout/text) →
 * @resvg/resvg-js (PNG). Mirrors the on-page facility title: a row of overlapped
 * fuel-tech badges (coloured circle + icon, exactly like FacilityPanelHeader)
 * followed by the facility name and a capacity · region · status subtitle.
 *
 *  - With a photo:  the photo fills the card under a dark gradient scrim, name in white.
 *  - Without a photo: a field of the dominant fuel-tech colour with a faint icon watermark.
 *
 * Imported only by scripts/generate-og-images.mjs (a Node build step) — never by
 * app routes, so the native resvg binary never enters the Cloudflare Worker bundle.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import satori from 'satori';
import { html } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { fuelTechColourMap } from '../../theme/openelectricity.js';
import { OG_CARD_WIDTH as WIDTH, OG_CARD_HEIGHT as HEIGHT } from '../../og/card-dimensions.js';
import { deriveCard, formatCardSubtitle } from '../../og/facility-card-data.js';

const ROOT = process.cwd();

// Fueltechs whose colour is light enough to need dark glyphs/text (mirrors
// $lib/utils/fueltech-display so this module stays node-importable without $lib).
const LIGHT_FUELTECHS = new Set([
	'solar_utility',
	'solar',
	'solar_rooftop',
	'gas_ocgt',
	'gas_recip'
]);
const needsDarkText = (/** @type {string} */ ft) => LIGHT_FUELTECHS.has(ft);
const fuelColour = (/** @type {string} */ ft) =>
	fuelTechColourMap[/** @type {keyof typeof fuelTechColourMap} */ (ft)] || '#777777';

// ---- assets (loaded once) -------------------------------------------------

/** @type {any[] | null} */
let _fonts = null;
function fonts() {
	if (!_fonts) {
		// satori can't parse the repo's variable fonts (fvar table), so use static
		// woff weights from Fontsource (dev deps). pnpm symlinks direct deps at the
		// top-level node_modules, so these paths resolve at build.
		_fonts = [
			{
				name: 'DM Sans',
				data: readFileSync(
					resolve(ROOT, 'node_modules/@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff')
				),
				weight: 700,
				style: 'normal'
			},
			{
				name: 'Space Grotesk',
				data: readFileSync(
					resolve(
						ROOT,
						'node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff'
					)
				),
				weight: 500,
				style: 'normal'
			}
		];
	}
	return _fonts;
}

/** @type {string | null} */
let _logoRaw = null;
/** @type {Map<string, string>} Recoloured logo data-URIs, keyed by colour. */
const _logoCache = new Map();
/** @param {string} colour */
function logoDataUri(colour) {
	const cached = _logoCache.get(colour);
	if (cached) return cached;
	if (_logoRaw === null) _logoRaw = readFileSync(resolve(ROOT, 'static/img/logo.svg'), 'utf8');
	const svg = _logoRaw.replaceAll('#353535', colour).replaceAll('#A29D66', colour);
	const uri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
	_logoCache.set(colour, uri);
	return uri;
}

/**
 * PascalCase a fueltech_id, mirroring FuelTechBadge's icon-name mapping
 * (coal_black → CoalBlack → CoalBlackSm.svelte).
 * @param {string} ft
 */
function pascalCase(ft) {
	return ft
		.split('_')
		.map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
		.join('');
}

/**
 * Reduce a Svelte icon component to its raw, standalone <svg> markup.
 * @param {string} content
 */
function svelteToSvg(content) {
	const m = content.match(/<svg[\s\S]*?<\/svg>/);
	if (!m) return '';
	// Strip Svelte-only bits that aren't valid standalone SVG.
	return m[0].replace(/\{\.\.\.rest\}/g, '').replace(/\sclass="[^"]*"/g, '');
}

/** @type {Map<string,string>} */
const _iconCache = new Map();

/**
 * Raw icon SVG for a fueltech, matching the facility pages — FuelTechBadge renders
 * $lib/icons/fuel-techs/<Name>Sm.svelte. Falls back to the base fueltech, then the
 * static icon set.
 * @param {string} ft
 */
function iconRaw(ft) {
	if (_iconCache.has(ft)) return _iconCache.get(ft);
	const base = ft.split('_')[0];
	let svg = '';
	for (const cand of [ft, base]) {
		try {
			const content = readFileSync(
				resolve(ROOT, `src/lib/icons/fuel-techs/${pascalCase(cand)}Sm.svelte`),
				'utf8'
			);
			svg = svelteToSvg(content);
			if (svg) break;
		} catch {
			/* try next */
		}
	}
	if (!svg) {
		for (const cand of [ft, base]) {
			try {
				svg = readFileSync(resolve(ROOT, `static/img/icons/${cand}.svg`), 'utf8');
				if (svg) break;
			} catch {
				/* try next */
			}
		}
	}
	_iconCache.set(ft, svg);
	return svg;
}

/**
 * Recolour an icon's `currentColor` strokes/fills and return a data URI.
 * @param {string} ft
 * @param {string} colour
 */
function iconDataUri(ft, colour) {
	const svg = iconRaw(ft);
	if (!svg) return '';
	const recoloured = svg.replaceAll('currentColor', colour);
	return `data:image/svg+xml;base64,${Buffer.from(recoloured).toString('base64')}`;
}

// ---- markup ---------------------------------------------------------------

/**
 * @param {string[]} fuelTechs
 * @param {string} ringColour
 */
function badgesMarkup(fuelTechs, ringColour) {
	// satori has no z-index, so stacking follows paint order (a later DOM node
	// paints on top). Render the badges reversed — the wrapper uses
	// `row-reverse`, so the leftmost badge is the last painted and sits on top,
	// matching the live card and the detail panel. `margin-right` does the
	// overlap in the reversed flow.
	return [...fuelTechs]
		.reverse()
		.map((ft, i) => {
			const icon = iconDataUri(ft, needsDarkText(ft) ? '#0b0b0b' : '#ffffff');
			const iconImg = icon ? `<img style="width:44px;height:44px;" src="${icon}" />` : '';
			return `<div style="display:flex;align-items:center;justify-content:center;width:74px;height:74px;border-radius:9999px;background:${fuelColour(
				ft
			)};border:4px solid ${ringColour};margin-right:${i ? -18 : 0}px;box-shadow:0 3px 10px rgba(0,0,0,0.28);">${iconImg}</div>`;
		})
		.join('');
}

/**
 * @param {object} opts
 * @param {string} opts.name
 * @param {string} opts.subtitle
 * @param {string} opts.textColour
 * @param {string} opts.subColour
 * @param {string} opts.ringColour
 * @param {string[]} opts.fuelTechs
 */
function titleBlock({ name, subtitle, textColour, subColour, ringColour, fuelTechs }) {
	return `<div style="position:absolute;left:64px;right:64px;bottom:60px;display:flex;flex-direction:column;">
		<div style="display:flex;flex-direction:row-reverse;justify-content:flex-end;align-items:center;">${badgesMarkup(
			fuelTechs,
			ringColour
		)}</div>
		<div style="display:flex;margin-top:26px;font-family:'DM Sans';font-weight:700;font-size:62px;line-height:1.04;color:${textColour};letter-spacing:-1px;max-width:1040px;">${escapeHtml(
			name
		)}</div>
		<div style="display:flex;margin-top:18px;font-family:'Space Grotesk';font-weight:500;font-size:28px;color:${subColour};">${escapeHtml(
			subtitle
		)}</div>
	</div>`;
}

/** @param {any} s */
function escapeHtml(s) {
	return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/**
 * Render a facility's OG card to a JPEG (PNG of a 1200×630 photo is ~800 KB;
 * JPEG keeps the set deploy-friendly while staying universally OG-compatible).
 * @param {{ facility: any, photoBuffer?: Buffer | Uint8Array | null }} opts
 * @returns {Promise<Buffer>}
 */
export async function renderFacilityOgCard({ facility, photoBuffer = null }) {
	const d = deriveCard(facility);
	const subtitle = formatCardSubtitle(d);

	let markup;
	if (photoBuffer && photoBuffer.length) {
		const photo = `data:image/jpeg;base64,${Buffer.from(photoBuffer).toString('base64')}`;
		markup = `<div style="display:flex;position:relative;width:${WIDTH}px;height:${HEIGHT}px;">
			<img src="${photo}" style="position:absolute;top:0;left:0;width:${WIDTH}px;height:${HEIGHT}px;object-fit:cover;" />
			<div style="display:flex;position:absolute;top:0;left:0;width:${WIDTH}px;height:${HEIGHT}px;background:linear-gradient(to bottom, rgba(0,0,0,0) 26%, rgba(0,0,0,0.5) 62%, rgba(0,0,0,0.86) 100%);"></div>
			<div style="display:flex;position:absolute;top:52px;left:64px;"><img style="width:219px;height:26px;" src="${logoDataUri(
				'#ffffff'
			)}" /></div>
			${titleBlock({
				name: d.name,
				subtitle,
				textColour: '#ffffff',
				subColour: 'rgba(255,255,255,0.85)',
				ringColour: 'rgba(255,255,255,0.9)',
				fuelTechs: d.fuelTechs
			})}
		</div>`;
	} else {
		const dark = needsDarkText(d.dominant);
		const textColour = dark ? '#0b0b0b' : '#ffffff';
		const subColour = dark ? 'rgba(0,0,0,0.72)' : 'rgba(255,255,255,0.88)';
		const watermark = iconDataUri(d.dominant, textColour);
		const watermarkImg = watermark
			? `<img src="${watermark}" style="position:absolute;right:-40px;bottom:-90px;width:520px;height:520px;opacity:0.1;" />`
			: '';
		markup = `<div style="display:flex;position:relative;width:${WIDTH}px;height:${HEIGHT}px;background:${fuelColour(
			d.dominant
		)};">
			${watermarkImg}
			<div style="display:flex;position:absolute;top:0;left:0;width:${WIDTH}px;height:${HEIGHT}px;background:linear-gradient(135deg, rgba(255,255,255,0.07), rgba(0,0,0,0.24));"></div>
			<div style="display:flex;position:absolute;top:52px;left:64px;"><img style="width:219px;height:26px;" src="${logoDataUri(
				textColour
			)}" /></div>
			${titleBlock({
				name: d.name,
				subtitle,
				textColour,
				subColour,
				ringColour: textColour,
				fuelTechs: d.fuelTechs
			})}
		</div>`;
	}

	const svg = await satori(html(markup), { width: WIDTH, height: HEIGHT, fonts: fonts() });
	const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng();
	return sharp(png).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
}
