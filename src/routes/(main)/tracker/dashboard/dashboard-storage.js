import { DASHBOARD_VERSION, validateSavedDashboard } from './dashboard-model.js';

export const SAVED_VIEWS_KEY = 'oe.tracker.dashboard.views.v1';
const LEGACY_KEYS = ['oe.tracker.v2.views.v1', 'oe.tracker.v2.views'];

/** @param {{ getItem: (key: string) => string | null } | null | undefined} storage */
export function loadSavedViews(storage) {
	if (!storage) return { views: [], available: false };
	try {
		const raw =
			storage.getItem(SAVED_VIEWS_KEY) ??
			LEGACY_KEYS.map((key) => storage.getItem(key)).find((value) => value !== null);
		if (!raw) return { views: [], available: true };
		const parsed = JSON.parse(raw);
		const candidates = Array.isArray(parsed) ? parsed : parsed?.views;
		if (!Array.isArray(candidates)) return { views: [], available: true };
		return {
			views: candidates.map(validateSavedDashboard).filter(Boolean),
			available: true
		};
	} catch {
		return { views: [], available: false };
	}
}

/** @param {{ setItem: (key: string, value: string) => void } | null | undefined} storage @param {any[]} views */
export function persistSavedViews(storage, views) {
	if (!storage) return false;
	try {
		storage.setItem(
			SAVED_VIEWS_KEY,
			JSON.stringify({
				version: DASHBOARD_VERSION,
				views: views.map(validateSavedDashboard).filter(Boolean)
			})
		);
		return true;
	} catch {
		return false;
	}
}

/** @param {any[]} views @param {any} dashboard */
export function upsertSavedView(views, dashboard) {
	const valid = validateSavedDashboard(dashboard);
	if (!valid) return [...views];
	const index = views.findIndex((view) => view.id === valid.id);
	if (index < 0) return [...views, valid];
	return views.map((view, i) => (i === index ? valid : view));
}

/** @param {any[]} views @param {string} id */
export function deleteSavedView(views, id) {
	return views.filter((view) => view.id !== id);
}
