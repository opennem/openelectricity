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
 * Colour-encoding legend. The active variant mirrors the point colour-encoding mode.
 * @typedef {(
 *   { mode: 'single', colour: string, label?: string } |
 *   { mode: 'category', label?: string, items: Array<{ label: string, colour: string }> } |
 *   { mode: 'range', label?: string, min: number, max: number, minColour: string, maxColour: string, formatValue?: (value: number) => string }
 * )} MapColourLegend
 *
 * Size-encoding legend. Marker radius scales with a numeric column. The chart
 * supplies representative `stops` (value + the radius the scale maps it to,
 * ordered ascending) so each reference marker matches the map exactly.
 * @typedef {{
 *   label?: string,
 *   stops: Array<{ value: number, radius: number }>,
 *   formatValue?: (value: number) => string
 * }} MapSizeLegend
 *
 * Legend overlay descriptor. `colour` mirrors the point colour-encoding mode;
 * `size`, when present, describes the independent radius encoding shown alongside it.
 * @typedef {{ colour: MapColourLegend, size?: MapSizeLegend | null }} MapLegendSpec
 */

export {};
