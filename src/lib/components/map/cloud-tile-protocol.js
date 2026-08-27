/**
 * Converts GIBS infrared tiles into a clouds-only MapLibre overlay. The source
 * is greyscale, so pixel luminance becomes alpha and clear sky disappears.
 *
 * `shaded` preserves cloud tones for light maps; `white` recolours clouds for
 * dark and satellite maps.
 */

/** URL scheme the cloud raster sources request tiles through. */
export const CLOUD_TILE_SCHEME = 'gibs-ir-clouds';

// Smoothstep between warm clear sky and bright, cold cloud tops.
const LUM_CLEAR = 0.4;
const LUM_CLOUD = 0.85;

/**
 * Cloud opacity for a pixel's luminance — 0 for clear-sky temperatures,
 * 1 for cold cloud tops, smoothstepped between.
 * @param {number} luminance 0..1
 * @returns {number} 0..1
 */
export function cloudAlpha(luminance) {
	const t = Math.min(1, Math.max(0, (luminance - LUM_CLEAR) / (LUM_CLOUD - LUM_CLEAR)));
	return t * t * (3 - 2 * t);
}

/**
 * Split a protocol request URL into its cloud style and the real tile URL.
 * @param {string} requestUrl `gibs-ir-clouds://<style>/https://…`
 * @returns {{ style: 'shaded' | 'white', url: string }}
 */
export function parseCloudTileUrl(requestUrl) {
	const prefix = `${CLOUD_TILE_SCHEME}://`;
	if (!requestUrl.startsWith(prefix)) throw new Error(`Invalid cloud tile URL: ${requestUrl}`);

	const rest = requestUrl.slice(prefix.length);
	const slash = rest.indexOf('/');
	if (slash < 0) throw new Error(`Invalid cloud tile URL: ${requestUrl}`);

	const style = rest.slice(0, slash);
	return {
		style: style === 'white' ? 'white' : 'shaded',
		url: rest.slice(slash + 1)
	};
}

/**
 * A fully transparent tile, for requests beyond the imagery's extent.
 * @returns {Promise<ArrayBuffer>}
 */
async function blankTile() {
	const canvas = new OffscreenCanvas(256, 256);
	canvas.getContext('2d');
	const blob = await canvas.convertToBlob({ type: 'image/png' });
	return blob.arrayBuffer();
}

/**
 * Fetch and repaint a cloud tile for MapLibre.
 * @param {{ url: string }} params request with a `gibs-ir-clouds://…` URL
 * @param {AbortController} abortController
 * @returns {Promise<{ data: ArrayBuffer }>}
 */
export async function loadCloudTile(params, abortController) {
	const { style, url } = parseCloudTileUrl(params.url);
	const response = await fetch(url, { signal: abortController.signal });
	// Tiles outside Himawari's coverage return HTML errors.
	if (!response.ok || !(response.headers.get('content-type') ?? '').startsWith('image/')) {
		return { data: await blankTile() };
	}

	const bitmap = await createImageBitmap(await response.blob());
	const { width, height } = bitmap;
	const canvas = new OffscreenCanvas(width, height);
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Unable to create a canvas context for the cloud tile');
	try {
		ctx.drawImage(bitmap, 0, 0);
	} finally {
		bitmap.close();
	}

	const image = ctx.getImageData(0, 0, width, height);
	const pixels = image.data;
	for (let i = 0; i < pixels.length; i += 4) {
		// The source is greyscale, so red represents luminance.
		const alpha = cloudAlpha(pixels[i] / 255) * (pixels[i + 3] / 255);
		if (style === 'white') {
			pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
		}
		pixels[i + 3] = Math.round(alpha * 255);
	}
	ctx.putImageData(image, 0, 0);

	const blob = await canvas.convertToBlob({ type: 'image/png' });
	return { data: await blob.arrayBuffer() };
}
