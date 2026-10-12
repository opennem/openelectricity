/**
 * Labelled time markers over a time-series plot (`TimeMarkers`): a
 * comparison's A and B. Given to `StratumChart` as `timeMarkers`. JSDoc-only.
 *
 * - `markers`: a dark line with a letter chip each, at an exact time (no row
 *   need match it); kept in PNG exports.
 * - `band`: faintly shade between the first two.
 * - `armed`: the marker the next click sets (with `onpick`); a dashed ghost
 *   of it follows this chart's own pointer, never a synced or pinned hover.
 *
 * @typedef {{
 *   markers: Array<{ id: string, time: number, label: string }>,
 *   armed?: string | null,
 *   band?: boolean
 * }} TimeMarkerSet
 */

export {};
