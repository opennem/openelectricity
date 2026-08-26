/**
 * Dev-only span timer around hot chart paths.
 *
 * Wraps a synchronous function in performance.mark/measure so per-frame costs
 * show up in the DevTools Performance panel (User Timing lane). A pass-through
 * in production builds.
 *
 * @type {<T>(name: string, fn: () => T) => T}
 */
export const perfSpan = import.meta.env.DEV
	? (name, fn) => {
			const start = `${name}:start`;
			performance.mark(start);
			try {
				return fn();
			} finally {
				performance.measure(name, start);
			}
		}
	: (_name, fn) => fn();

/** localStorage flag for gesture frame-rate logging. */
const FPS_DEBUG_KEY = 'oe:debug-chart-fps';

const fpsDebugEnabled = () => {
	try {
		return typeof localStorage !== 'undefined' && localStorage.getItem(FPS_DEBUG_KEY) === '1';
	} catch {
		return false;
	}
};

/**
 * Measure gesture frame times when `oe:debug-chart-fps` is enabled.
 *
 * @returns {{ start: () => void, stop: () => void }}
 */
export const createFrameProbe = import.meta.env.DEV
	? (label = 'chart:gesture') => {
			let rafId = 0;
			let last = 0;
			/** @type {number[]} */
			let deltas = [];

			/** @param {number} now */
			const tick = (now) => {
				if (last) deltas.push(now - last);
				last = now;
				rafId = requestAnimationFrame(tick);
			};

			return {
				start() {
					if (rafId || !fpsDebugEnabled()) return;
					last = 0;
					deltas = [];
					rafId = requestAnimationFrame(tick);
				},
				stop() {
					if (!rafId) return;
					cancelAnimationFrame(rafId);
					rafId = 0;
					if (!deltas.length) return;
					const over16 = deltas.filter((d) => d > 16.7).length;
					const over33 = deltas.filter((d) => d > 33.4).length;
					const worst = Math.max(...deltas);
					console.info(
						`[${label}] ${deltas.length} frames · >16ms: ${over16} · >33ms: ${over33} · worst: ${worst.toFixed(1)}ms`
					);
				}
			};
		}
	: () => ({ start() {}, stop() {} });
