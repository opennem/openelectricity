/**
 * Chart Elements v2
 *
 * Refactored SVG chart elements for use with LayerCake.
 * Clean, well-documented components with consistent APIs.
 */

// Core chart elements
export { default as StackedArea } from './StackedArea.svelte';
export { default as Line } from './Line.svelte';
export { default as HoverLayer } from './HoverLayer.svelte';
export { default as CategoryHoverLayer } from './CategoryHoverLayer.svelte';
export { default as CategoryLine } from './CategoryLine.svelte';

// Axes
export { default as AxisX } from './AxisX.svelte';
export { default as AxisY } from './AxisY.svelte';
export { default as CategoryAxisX } from './CategoryAxisX.svelte';

// Annotations/Indicators
export { default as LineX } from './LineX.svelte';
export { default as LineY } from './LineY.svelte';
export { default as Dot } from './Dot.svelte';

// Overlays
export { default as CategoryOverlay } from './CategoryOverlay.svelte';
export { default as Shading } from './Shading.svelte';
export { default as PanZoomLayer } from './PanZoomLayer.svelte';
export { default as LoadingOverlay } from './LoadingOverlay.svelte';

// Definitions
export { default as ClipPath } from './ClipPath.svelte';
