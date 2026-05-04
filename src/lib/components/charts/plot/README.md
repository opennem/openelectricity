# Observable Plot Chart System

A layered chart system built on [Observable Plot](https://observablehq.com/plot/) for rendering data visualisations with annotations, tooltips, and interactive hover.

## Architecture

```
StratifyPlotChart          High-level component: data props + chart type + annotations
  └─ PlotChart             Low-level wrapper: raw PlotOptions + responsive width
       └─ plotChart action  Svelte action that calls Observable Plot's plot()
```

**PlotChart** is a thin wrapper that measures container width and delegates to Observable Plot via a Svelte action. It accepts raw `PlotOptions`.

**StratifyPlotChart** is the recommended entry point for Stratify charts. It accepts data-level props, selects the right chart factory, adds hover/tooltips, processes annotations, and renders via `PlotChart`.

## StratifyPlotChart

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `Array<Record<string, any>>` | required | Parsed row objects (with `date` or `category` key) |
| `seriesNames` | `string[]` | required | Series column keys |
| `seriesColours` | `Record<string, string>` | required | Series key to colour hex |
| `seriesLabels` | `Record<string, string>` | required | Series key to display label |
| `chartType` | `StratifyPlotChartType` | required | Chart type (see below) |
| `seriesChartTypes` | `Record<string, string>` | `{}` | Per-series chart type overrides (see below) |
| `plotOverrides` | `PlotOverrides \| null` | `null` | Extended Plot config overrides (see below) |
| `height` | `number` | `300` | Chart height in px (per-panel when faceting) |
| `showLegend` | `boolean` | `true` | Show/hide the colour legend |
| `facetColumn` | `string \| null` | `null` | Column key to partition data into small-multiple panels |
| `options` | `TimeSeriesOptions` | `{}` | Pass-through for curve, xDomain, margins, etc. |
| `annotations` | `Annotation[]` | `[]` | Annotation configs (see below) |
| `class` | `string` | `''` | CSS classes for the outer container |

### Chart Types

| Value | Description |
|-------|-------------|
| `'stacked-area'` | Time-series stacked area |
| `'area'` | Alias for stacked-area |
| `'line'` | Multi-series line chart |
| `'bar-stacked'` | Category stacked bar |
| `'grouped-bar'` | Category grouped bar |
| `'dot'` | Dot (scatter) chart |

### Basic Usage

```svelte
<script>
  import StratifyPlotChart from '$lib/components/charts/plot/StratifyPlotChart.svelte';
  import { parseCSV } from '$lib/stratify/csv-parser.js';

  const parsed = parseCSV(csvString);
</script>

<StratifyPlotChart
  data={parsed.data}
  seriesNames={parsed.seriesNames}
  seriesColours={parsed.seriesColours}
  seriesLabels={parsed.seriesLabels}
  chartType="line"
  height={280}
/>
```

### Built-in Features

- **Hover crosshair** — vertical rule following the cursor (time-series charts)
- **Tooltips** — shows all series values at the hovered position (time-series) or individual bar values (category charts)

---

## Annotations

Annotations are declarative configs passed as an array. Each annotation produces Observable Plot marks and optional margin adjustments.

### Annotation Types

#### `end-labels`

Labels at the right edge of each series line/area. Automatically calculates right margin from the longest label. Includes anti-collision to prevent overlapping labels.

```js
{ type: 'end-labels' }

// With custom style
{ type: 'end-labels', style: { colour: '#333', fontSize: 12 } }
```

**Applicable to:** `line`, `stacked-area`, `area`

#### `x-rule`

A vertical rule at a specific x position with a text label at the top.

```js
{ type: 'x-rule', x: '2024-04-01', text: 'Event name' }

// With custom style
{
  type: 'x-rule',
  x: '2024-04-01',
  text: 'Bushfires',
  style: { lineStyle: 'dotted', lineColour: '#c00', colour: '#c00' }
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `x` | `string \| Date` | yes | X position (date string or category) |
| `text` | `string` | yes | Label text |
| `style` | `AnnotationStyle` | no | Visual overrides |

#### `bar-labels`

Total value labels positioned above each stacked bar. Values are formatted compactly (e.g. `26.7k`, `1.2M`).

```js
{ type: 'bar-labels' }

// With custom style
{ type: 'bar-labels', style: { colour: '#000', fontWeight: 'bold' } }
```

**Applicable to:** `bar-stacked`

#### `point`

Free-form text annotation at a specific data coordinate. Supports arrow indicators and stacked series positioning.

```js
// Point to a specific series value
{ type: 'point', x: '2024-07-01', series: 'qld', text: 'Peak demand' }

// Point to a stacked series (resolves to midpoint of the band)
{
  type: 'point',
  x: '2024-06-01',
  series: 'gas',
  stacked: true,
  text: "Annotation text",
  style: { colour: '#000', fontSize: 16, fontWeight: 'bold' }
}

// Explicit y position, no arrow
{ type: 'point', x: '2024-01-01', y: 5000, text: 'Note', arrow: false }
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `x` | `string \| Date` | required | X position |
| `series` | `string` | - | Series key to look up y value from data |
| `y` | `number` | - | Explicit y position (used if series not provided) |
| `text` | `string` | required | Annotation text |
| `arrow` | `boolean` | `true` | Show arrow pointing to the data point |
| `stacked` | `boolean` | `false` | Resolve y to the stacked midpoint of the series band |
| `style` | `AnnotationStyle` | - | Visual overrides |

### AnnotationStyle

All annotation types accept an optional `style` object:

| Property | Type | Description |
|----------|------|-------------|
| `colour` | `string` | Text fill colour (also default line stroke) |
| `fontSize` | `number` | Text size in px |
| `fontWeight` | `string` | e.g. `'bold'`, `'normal'` |
| `fontFamily` | `string` | Font family override |
| `lineColour` | `string` | Line stroke colour (overrides `colour`) |
| `lineWidth` | `number` | Line stroke width in px |
| `lineStyle` | `'solid' \| 'dashed' \| 'dotted'` | Line dash pattern |

### Combining Annotations

Multiple annotations can be combined on a single chart:

```js
annotations={[
  { type: 'x-rule', x: '2024-04-01', text: 'Event', style: { lineStyle: 'dotted' } },
  { type: 'point', x: '2024-06-01', series: 'gas', stacked: true, text: 'Note',
    style: { colour: '#000', fontSize: 16, fontWeight: 'bold' } }
]}
```

---

## File Structure

| File | Purpose |
|------|---------|
| `PlotChart.svelte` | Low-level rendering wrapper |
| `StratifyPlotChart.svelte` | High-level component with data props, tooltips, annotations |
| `plot-action.js` | Svelte action that calls Observable Plot |
| `plot-configs.js` | Factory functions for each chart type + mixed mark support |
| `plot-overrides.js` | PlotOverrides merge system for extended configuration |
| `plot-annotations.js` | Annotation system (types, processing, mark generation) |
| `PlotChartOptions.svelte.js` | Reactive chart options state (used by facility-plot) |
| `PlotChartTheme.svelte.js` | Theme system with CSS custom properties |
| `PlotInteraction.svelte.js` | Pan/zoom/tooltip interaction state |
| `PlotSync.svelte.js` | Multi-chart synchronisation controller |
| `plot-overlays.js` | Night shading and coordinate conversion |
| `plot-gridlines.js` | Timezone-aware gridline computation |

## Adding a New Chart Type

1. Add a factory function in `plot-configs.js` following the signature: `(data, seriesNames, colours, labels, options?) => PlotOptions`
2. Register it in `CONFIG_MAP` within `StratifyPlotChart.svelte`
3. Extend the `StratifyPlotChartType` typedef

## Adding a New Annotation Type

1. Define the typedef in `plot-annotations.js`
2. Add it to the `Annotation` union type
3. Implement a handler function returning `{ marks, marginRight }`
4. Add a case to the switch in `processAnnotations()`

---

## Per-Series Chart Type Override

Override the chart type for individual series by passing `seriesChartTypes`:

```svelte
<StratifyPlotChart
  {data}
  {seriesNames}
  {seriesColours}
  {seriesLabels}
  chartType="line"
  seriesChartTypes={{ demand: 'bar', price: 'dot' }}
/>
```

Available per-series mark types: `'area'`, `'line'`, `'bar'`, `'dot'`. When `seriesChartTypes` is empty or omitted, all series use the global `chartType`.

The renderer partitions series by mark type and creates separate Observable Plot marks for each group. Area series are stacked, bar series grouped, and line/dot series overlaid.

---

## Plot Overrides

The `plotOverrides` prop allows arbitrary Observable Plot configuration to be deep-merged into the factory output. This enables scale types, faceting, layout, and extra marks without modifying the chart factories.

See `plot-overrides.js` for the `PlotOverrides` type definition and `resolveMarkSpec()` for the declarative mark format.

### Example

```svelte
<StratifyPlotChart
  {data}
  {seriesNames}
  {seriesColours}
  {seriesLabels}
  chartType="line"
  plotOverrides={{
    y: { type: 'log', nice: true },
    layout: { title: 'Log Scale', marginLeft: 50 },
    extraMarks: [
      { markType: 'rule-y', data: [1000], options: { stroke: 'red', strokeDasharray: '4,3' } }
    ]
  }}
/>
```
