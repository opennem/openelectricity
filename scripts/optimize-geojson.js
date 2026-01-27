#!/usr/bin/env node
/**
 * GeoJSON Optimization Script
 * ===========================
 *
 * Reduces GeoJSON file sizes for faster map loading. Optimizes files in static/data/.
 *
 * Usage:
 *   bun run scripts/optimize-geojson.js
 *
 * Optimizations applied:
 *   1. Coordinate precision - Reduces decimal places from 7+ to 5 (~1.1m accuracy)
 *   2. JSON minification - Removes whitespace and formatting
 *   3. Geometry simplification - Douglas-Peucker algorithm removes redundant vertices
 *
 * Configuration:
 *   - PRECISION: Number of decimal places for coordinates (default: 5)
 *   - tolerance: Simplification tolerance in degrees (default: 0.0001 ≈ 11m)
 *
 * To add new files, update the `files` array at the bottom of this script.
 *
 * Typical results:
 *   - Polygon/line files: 70-85% reduction
 *   - Point files: 10-15% reduction (only precision + minification)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRECISION = 5; // ~1.1 meter accuracy

/**
 * Round coordinates to specified precision
 */
function roundCoord(num) {
	return Math.round(num * 10 ** PRECISION) / 10 ** PRECISION;
}

/**
 * Process coordinates recursively (handles nested arrays for polygons/multipolygons)
 */
function processCoordinates(coords) {
	if (typeof coords[0] === 'number') {
		// This is a coordinate pair [lng, lat] or [lng, lat, alt]
		return coords.map(roundCoord);
	}
	// Nested array - recurse
	return coords.map(processCoordinates);
}

/**
 * Simplify a line/polygon ring using Douglas-Peucker algorithm
 */
function simplifyLine(coords, tolerance = 0.0001) {
	if (coords.length <= 2) return coords;

	// Find point with maximum distance from line between first and last
	let maxDist = 0;
	let maxIndex = 0;

	const [x1, y1] = coords[0];
	const [x2, y2] = coords[coords.length - 1];

	for (let i = 1; i < coords.length - 1; i++) {
		const [x, y] = coords[i];
		// Perpendicular distance from point to line
		const dist =
			Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) /
			Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);

		if (dist > maxDist) {
			maxDist = dist;
			maxIndex = i;
		}
	}

	if (maxDist > tolerance) {
		// Recursively simplify both halves
		const left = simplifyLine(coords.slice(0, maxIndex + 1), tolerance);
		const right = simplifyLine(coords.slice(maxIndex), tolerance);
		return left.slice(0, -1).concat(right);
	}

	// All points within tolerance - return just endpoints
	return [coords[0], coords[coords.length - 1]];
}

/**
 * Simplify geometry based on type
 */
function simplifyGeometry(geometry, tolerance) {
	if (!geometry || !geometry.coordinates) return geometry;

	const { type, coordinates } = geometry;

	switch (type) {
		case 'LineString':
			return {
				type,
				coordinates: simplifyLine(coordinates, tolerance)
			};

		case 'MultiLineString':
			return {
				type,
				coordinates: coordinates.map((line) => simplifyLine(line, tolerance))
			};

		case 'Polygon':
			return {
				type,
				coordinates: coordinates.map((ring) => {
					const simplified = simplifyLine(ring, tolerance);
					// Ensure polygon is closed
					if (
						simplified.length > 0 &&
						(simplified[0][0] !== simplified[simplified.length - 1][0] ||
							simplified[0][1] !== simplified[simplified.length - 1][1])
					) {
						simplified.push(simplified[0]);
					}
					// Polygon needs at least 4 points
					return simplified.length >= 4 ? simplified : ring;
				})
			};

		case 'MultiPolygon':
			return {
				type,
				coordinates: coordinates.map((polygon) =>
					polygon.map((ring) => {
						const simplified = simplifyLine(ring, tolerance);
						if (
							simplified.length > 0 &&
							(simplified[0][0] !== simplified[simplified.length - 1][0] ||
								simplified[0][1] !== simplified[simplified.length - 1][1])
						) {
							simplified.push(simplified[0]);
						}
						return simplified.length >= 4 ? simplified : ring;
					})
				)
			};

		default:
			return geometry;
	}
}

/**
 * Process a single feature
 */
function processFeature(feature, options = {}) {
	const { simplify = false, tolerance = 0.0001 } = options;

	const result = { ...feature };

	if (feature.geometry) {
		let geometry = feature.geometry;

		// Simplify if requested
		if (simplify) {
			geometry = simplifyGeometry(geometry, tolerance);
		}

		// Round coordinates
		if (geometry.coordinates) {
			result.geometry = {
				...geometry,
				coordinates: processCoordinates(geometry.coordinates)
			};
		}
	}

	return result;
}

/**
 * Process a GeoJSON file
 */
function optimizeGeoJSON(inputPath, outputPath, options = {}) {
	console.log(`\nProcessing: ${basename(inputPath)}`);

	const input = readFileSync(inputPath, 'utf-8');
	const inputSize = Buffer.byteLength(input);
	console.log(`  Input size: ${(inputSize / 1024 / 1024).toFixed(2)} MB`);

	const geojson = JSON.parse(input);

	let output;

	if (geojson.type === 'FeatureCollection') {
		const processed = {
			type: 'FeatureCollection',
			features: geojson.features.map((f) => processFeature(f, options))
		};
		output = JSON.stringify(processed);
	} else if (geojson.type === 'Feature') {
		output = JSON.stringify(processFeature(geojson, options));
	} else {
		// Just minify and round coordinates
		output = JSON.stringify(geojson);
	}

	const outputSize = Buffer.byteLength(output);
	const reduction = ((1 - outputSize / inputSize) * 100).toFixed(1);

	writeFileSync(outputPath, output);
	console.log(`  Output size: ${(outputSize / 1024 / 1024).toFixed(2)} MB`);
	console.log(`  Reduction: ${reduction}%`);
}

// ---------------------------------------------------------------------------
// Configuration - Add or modify files to optimize here
// ---------------------------------------------------------------------------
const dataDir = join(__dirname, '..', 'static', 'data');

const files = [
	// Lines - simplify to reduce vertices
	{
		input: 'transmission-lines.geojson',
		output: 'transmission-lines.geojson',
		options: { simplify: true, tolerance: 0.0001 }
	},
	// Polygons - simplify to reduce vertices
	{
		input: 'golf-courses.geojson',
		output: 'golf-courses.geojson',
		options: { simplify: true, tolerance: 0.0001 }
	},
	// Points - no simplification needed, just precision reduction
	{
		input: 'golf-courses-points.geojson',
		output: 'golf-courses-points.geojson',
		options: { simplify: false }
	}
];

console.log('GeoJSON Optimization');
console.log('====================');
console.log(`Coordinate precision: ${PRECISION} decimal places`);

for (const { input, output, options } of files) {
	const inputPath = join(dataDir, input);
	const outputPath = join(dataDir, output);
	optimizeGeoJSON(inputPath, outputPath, options);
}

console.log('\nDone!');
