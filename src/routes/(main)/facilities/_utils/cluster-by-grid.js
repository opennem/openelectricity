/**
 * Bin facility points into a lat/lng grid and aggregate count + weight per
 * cell. Used by the hex-aggregate marker mode so each cluster renders as one
 * column with radius scaled by facility count and height scaled by the
 * summed metric (capacity / generation / pollution).
 *
 * Cell size is in degrees — at AU latitudes 0.5° is roughly 55 km lat ×
 * 45 km lng, which gives a coarse "regional" grid. Tune the value at the
 * call site if you want finer/coarser bins.
 *
 * @param {Array<{ position: [number, number], weight: number, color?: [number, number, number] }>} data
 * @param {number} cellSizeDeg
 * @returns {Array<{
 *   position: [number, number],
 *   count: number,
 *   weight: number,
 *   color: [number, number, number]
 * }>}
 */
export function clusterByGrid(data, cellSizeDeg = 0.5) {
	/**
	 * @type {Map<string, {
	 *   lngSum: number,
	 *   latSum: number,
	 *   count: number,
	 *   weight: number,
	 *   r: number,
	 *   g: number,
	 *   b: number
	 * }>}
	 */
	const cells = new Map();

	for (const d of data) {
		const [lng, lat] = d.position;
		const cellLng = Math.floor(lng / cellSizeDeg);
		const cellLat = Math.floor(lat / cellSizeDeg);
		const key = `${cellLng},${cellLat}`;
		let cell = cells.get(key);
		if (!cell) {
			cell = { lngSum: 0, latSum: 0, count: 0, weight: 0, r: 0, g: 0, b: 0 };
			cells.set(key, cell);
		}
		cell.lngSum += lng;
		cell.latSum += lat;
		cell.count += 1;
		cell.weight += d.weight;
		if (d.color) {
			cell.r += d.color[0];
			cell.g += d.color[1];
			cell.b += d.color[2];
		}
	}

	const out = [];
	for (const c of cells.values()) {
		out.push({
			position: /** @type {[number, number]} */ ([c.lngSum / c.count, c.latSum / c.count]),
			count: c.count,
			weight: c.weight,
			color: /** @type {[number, number, number]} */ ([
				Math.round(c.r / c.count),
				Math.round(c.g / c.count),
				Math.round(c.b / c.count)
			])
		});
	}
	return out;
}
