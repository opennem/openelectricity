export const TRACKER_VIEW_STORAGE_INDEX = 'oe:tracker-explore:index:v1';
export const TRACKER_VIEW_STORAGE_PREFIX = 'oe:tracker-explore:view:v1:';
export const MAX_LOCAL_TRACKER_VIEWS = 50;

/** @returns {Storage|null} */
function storage() {
	try {
		return typeof localStorage === 'undefined' ? null : localStorage;
	} catch {
		return null;
	}
}

/** @returns {Array<{id:string,name:string,createdAt:string,updatedAt:string}>} */
export function listLocalTrackerViews() {
	const target = storage();
	if (!target) return [];
	try {
		const value = JSON.parse(target.getItem(TRACKER_VIEW_STORAGE_INDEX) ?? '[]');
		if (!Array.isArray(value)) return [];
		return value.filter(
			(item) =>
				item &&
				typeof item.id === 'string' &&
				typeof item.name === 'string' &&
				typeof item.createdAt === 'string' &&
				typeof item.updatedAt === 'string'
		);
	} catch {
		return [];
	}
}

/** @param {string} id */
export function loadLocalTrackerView(id) {
	const target = storage();
	if (!target || !id) return null;
	try {
		const record = JSON.parse(target.getItem(TRACKER_VIEW_STORAGE_PREFIX + id) ?? 'null');
		return record && record.id === id && record.snapshot ? record : null;
	} catch {
		return null;
	}
}

/** @param {any} snapshot @param {string} [existingId] */
export function saveLocalTrackerView(snapshot, existingId) {
	const target = storage();
	if (!target) return { ok: false, error: 'Browser storage is unavailable.' };
	const index = listLocalTrackerViews();
	if (!existingId && index.length >= MAX_LOCAL_TRACKER_VIEWS) {
		return { ok: false, error: `This browser can store up to ${MAX_LOCAL_TRACKER_VIEWS} views.` };
	}
	const current = existingId ? loadLocalTrackerView(existingId) : null;
	const id = current?.id ?? globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
	const now = new Date().toISOString();
	const record = {
		id,
		createdAt: current?.createdAt ?? now,
		updatedAt: now,
		snapshot
	};
	const metadata = { id, name: snapshot.name, createdAt: record.createdAt, updatedAt: now };
	const nextIndex = [metadata, ...index.filter((item) => item.id !== id)];
	try {
		target.setItem(TRACKER_VIEW_STORAGE_PREFIX + id, JSON.stringify(record));
		target.setItem(TRACKER_VIEW_STORAGE_INDEX, JSON.stringify(nextIndex));
		return { ok: true, record };
	} catch {
		return { ok: false, error: 'The view could not be saved in this browser.' };
	}
}

/** @param {string} id */
export function deleteLocalTrackerView(id) {
	const target = storage();
	if (!target) return false;
	try {
		target.removeItem(TRACKER_VIEW_STORAGE_PREFIX + id);
		target.setItem(
			TRACKER_VIEW_STORAGE_INDEX,
			JSON.stringify(listLocalTrackerViews().filter((item) => item.id !== id))
		);
		return true;
	} catch {
		return false;
	}
}
