/** Run deduplicated prefetch jobs one per idle slice. Pauses preserve the queue.
 * Nothing is prefetched while the reader has asked to save data (the
 * browser's Data Saver / `navigator.connection.saveData`): prefetching is
 * speculative, and everything still loads when it's actually needed. */

/** @typedef {{ key: string, run: () => void }} IdleJob */

/** @param {() => void} cb @returns {any} */
const defaultScheduleIdle = (cb) =>
	typeof requestIdleCallback === 'function'
		? requestIdleCallback(cb, { timeout: 2000 })
		: setTimeout(cb, 200);

/** The reader has asked the browser to save data. */
export const savingData = () =>
	typeof navigator !== 'undefined' &&
	/** @type {{ connection?: { saveData?: boolean } }} */ (navigator).connection?.saveData === true;

/** @param {any} token */
const defaultCancelIdle = (token) =>
	typeof cancelIdleCallback === 'function' ? cancelIdleCallback(token) : clearTimeout(token);

/**
 * @param {{
 *   scheduleIdle?: (cb: () => void) => any,
 *   cancelIdle?: (token: any) => void,
 *   paused?: () => boolean
 * }} [options]
 */
export function createIdlePrefetcher({
	scheduleIdle = defaultScheduleIdle,
	cancelIdle = defaultCancelIdle,
	paused
} = {}) {
	/** @type {IdleJob[]} */
	let queue = [];
	/** Keys completed across all plans. */
	const done = new Set();
	/** @type {any} */
	let token = null;
	let stopped = false;

	function pump() {
		token = null;
		if (stopped) return;
		if (paused?.()) {
			// Preserve the job and retry on the next idle slice.
			arm();
			return;
		}
		const job = queue.shift();
		if (job && !done.has(job.key)) {
			done.add(job.key);
			try {
				job.run();
			} catch {
				// Failed prefetches do not block later jobs.
			}
		}
		if (queue.length) arm();
	}

	function arm() {
		if (token != null || stopped || savingData()) return;
		token = scheduleIdle(pump);
	}

	function clearScheduled() {
		if (token != null) cancelIdle(token);
		token = null;
		queue = [];
	}

	return {
		/**
		 * Replace queued work, excluding completed keys.
		 * @param {IdleJob[]} jobs
		 */
		setPlan(jobs) {
			queue = jobs.filter((job) => !done.has(job.key));
		},

		/** Schedule queued work. */
		kick() {
			if (!stopped && queue.length) arm();
		},

		/** Clear queued and completed jobs for a new manager. */
		reset() {
			if (stopped) return;
			clearScheduled();
			done.clear();
		},

		/** Cancel scheduling and clear the queue. */
		stop() {
			stopped = true;
			clearScheduled();
		}
	};
}
