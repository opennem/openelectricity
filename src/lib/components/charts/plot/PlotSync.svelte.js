/**
 * Multi-chart synchronisation controller for Observable Plot charts.
 *
 * Coordinates viewport (pan/zoom) and hover state across multiple
 * PlotInteraction instances. Uses a broadcasting guard to prevent
 * recursive update loops.
 */

export default class PlotSync {
	/** @type {Array<{ interaction: import('./PlotInteraction.svelte.js').default, containerWidth: () => number }>} */
	#charts = [];

	/** @type {boolean} */
	#broadcasting = false;

	/**
	 * Register a chart for synchronisation.
	 * @param {import('./PlotInteraction.svelte.js').default} interaction
	 * @param {() => number} containerWidth - function returning current container width
	 */
	addChart(interaction, containerWidth) {
		this.#charts.push({ interaction, containerWidth });

		// Wire up sync callbacks
		interaction.onViewportSync = (start, end) => {
			this.#syncViewport(start, end, interaction);
		};
		interaction.onHoverSync = (timeMs) => {
			this.#syncHover(timeMs, interaction);
		};
		interaction.onHoverClear = () => {
			this.#clearHover(interaction);
		};
	}

	/**
	 * Remove a chart from synchronisation.
	 * @param {import('./PlotInteraction.svelte.js').default} interaction
	 */
	removeChart(interaction) {
		this.#charts = this.#charts.filter((c) => c.interaction !== interaction);
		interaction.onViewportSync = null;
		interaction.onHoverSync = null;
		interaction.onHoverClear = null;
	}

	/**
	 * Sync viewport across all charts except the source.
	 * @param {number} start
	 * @param {number} end
	 * @param {import('./PlotInteraction.svelte.js').default} source
	 */
	#syncViewport(start, end, source) {
		if (this.#broadcasting) return;
		this.#broadcasting = true;

		for (const chart of this.#charts) {
			if (chart.interaction !== source) {
				chart.interaction.setViewport(start, end);
				// Trigger the target chart's own data fetching
				chart.interaction.onViewportChange(start, end);
			}
		}

		this.#broadcasting = false;
	}

	/**
	 * Sync hover time across all charts except the source.
	 * Each chart looks up its own data for the given time.
	 * @param {number} timeMs
	 * @param {import('./PlotInteraction.svelte.js').default} source
	 */
	#syncHover(timeMs, source) {
		if (this.#broadcasting) return;
		this.#broadcasting = true;

		for (const chart of this.#charts) {
			if (chart.interaction !== source) {
				chart.interaction.setHoverFromSync(timeMs, chart.containerWidth());
			}
		}

		this.#broadcasting = false;
	}

	/**
	 * Clear hover on all charts except the source.
	 * @param {import('./PlotInteraction.svelte.js').default} source
	 */
	#clearHover(source) {
		if (this.#broadcasting) return;
		this.#broadcasting = true;

		for (const chart of this.#charts) {
			if (chart.interaction !== source) {
				chart.interaction.hoverData = null;
				chart.interaction.hoverBandEnd = 0;
			}
		}

		this.#broadcasting = false;
	}
}
