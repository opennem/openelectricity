/**
 * Shared types for the generic PointMap component.
 *
 * @typedef {{
 *   id: string | number,
 *   lng: number,
 *   lat: number,
 *   label: string,
 *   colour: string,
 *   radius: number,
 *   raw: Record<string, any>
 * }} MapPoint
 *
 * Legend overlay descriptor. The active variant mirrors the point colour-encoding mode.
 * @typedef {(
 *   { mode: 'single', colour: string, label?: string } |
 *   { mode: 'category', label?: string, items: Array<{ label: string, colour: string }> } |
 *   { mode: 'range', label?: string, min: number, max: number, minColour: string, maxColour: string, formatValue?: (value: number) => string }
 * )} MapLegendSpec
 */

export {};
