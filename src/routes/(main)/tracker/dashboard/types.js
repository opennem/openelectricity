// JSDoc-only type home. Keeping these shapes beside the dashboard avoids adding a store
// or making the legacy Tracker depend on the experimental route.

/**
 * @typedef {Object} DashboardPanelV1
 * @property {string} instanceId
 * @property {'metrics'|'generation'|'price'|'emissions'|'demand'|'curtailment'|'flows'|'map'} type
 * @property {'half'|'full'} width
 * @property {'compact'|'standard'|'tall'} height
 * @property {Record<string, unknown>} settings
 */

export {};
