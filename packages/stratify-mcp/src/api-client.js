/**
 * Stratify API client for online mode.
 */

export class StratifyApiClient {
	/** @type {string} */
	#baseUrl;
	/** @type {string} */
	#token;

	/**
	 * @param {string} baseUrl
	 * @param {string} token
	 */
	constructor(baseUrl, token) {
		this.#baseUrl = baseUrl.replace(/\/$/, '');
		this.#token = token;
	}

	/**
	 * @param {string} path
	 * @param {RequestInit} [options]
	 */
	async #fetch(path, options = {}) {
		const url = `${this.#baseUrl}${path}`;
		const res = await fetch(url, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.#token}`,
				...(options.headers || {})
			}
		});

		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(`API ${res.status}: ${text || res.statusText}`);
		}

		return res.json();
	}

	/**
	 * Create a new chart.
	 * @param {Record<string, any>} config
	 */
	async createChart(config) {
		return this.#fetch('/api/stratify/charts', {
			method: 'POST',
			body: JSON.stringify(config)
		});
	}

	/**
	 * Get a chart by ID.
	 * @param {string} id
	 */
	async getChart(id) {
		return this.#fetch(`/api/stratify/charts/${id}`);
	}

	/**
	 * Update a chart.
	 * @param {string} id
	 * @param {Record<string, any>} fields
	 */
	async updateChart(id, fields) {
		return this.#fetch(`/api/stratify/charts/${id}`, {
			method: 'PATCH',
			body: JSON.stringify(fields)
		});
	}

	/**
	 * Delete a chart.
	 * @param {string} id
	 */
	async deleteChart(id) {
		return this.#fetch(`/api/stratify/charts/${id}`, { method: 'DELETE' });
	}

	/**
	 * List charts.
	 * @param {'draft' | 'published'} [status]
	 */
	async listCharts(status) {
		const qs = status ? `?status=${status}` : '';
		return this.#fetch(`/api/stratify/charts${qs}`);
	}

	/**
	 * Fork a chart.
	 * @param {string} id
	 */
	async forkChart(id) {
		return this.#fetch(`/api/stratify/charts/${id}/fork`, { method: 'POST' });
	}
}
