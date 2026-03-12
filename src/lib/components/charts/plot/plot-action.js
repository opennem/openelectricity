/**
 * Svelte action that renders an Observable Plot chart into a DOM element.
 *
 * Usage: <div use:plotChart={plotOptions}></div>
 *
 * When `plotOptions` changes (via $derived), Svelte calls `update` automatically,
 * replacing the old chart with a freshly rendered one.
 */
import { plot } from '@observablehq/plot';

/**
 * @param {HTMLElement} node - Container element
 * @param {import('@observablehq/plot').PlotOptions} options - Plot configuration
 */
export function plotChart(node, options) {
	let chart = plot(options);
	node.append(chart);

	return {
		/** @param {import('@observablehq/plot').PlotOptions} options */
		update(options) {
			chart.remove();
			chart = plot(options);
			node.append(chart);
		},
		destroy() {
			chart.remove();
		}
	};
}
