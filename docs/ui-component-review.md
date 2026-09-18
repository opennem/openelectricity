# Bits UI component review

Bits UI is upgraded from 2.18.1 to 2.19.2 (verified against the npm `latest` tag
on 17 September 2026). These changes are awaiting manual review.

## Shared behaviour

- `src/lib/components/Modal.svelte` uses Bits UI Dialog with a portal, backdrop,
  focus trap, scroll lock, Escape/outside dismissal and focus restoration. Its
  callers bind `open`, supply a `title` (rendered as the dialog's visible
  heading, adjustable with `titleLevel`/`titleClass`, with an optional `header`
  snippet beside it) and use `fullscreen` for mobile filters.
- `src/lib/components/form-elements/Select.svelte` uses Bits UI Select for
  desktop dropdowns: arrow keys move the highlight without committing, Enter or
  Space commits and closes, Escape dismisses and restores focus. Expanded mobile
  lists use Bits UI Radio Group, where arrow keys change the selection directly.
- Existing option objects, numeric/string/null values, descriptions, dividers,
  group headings and selection callbacks remain supported. An unselected control
  retains its `formLabel` (for example, “Add Model”).

## Modal checklist

Use `http://openelectricity.localhost:7602` for local checks. For each active modal,
check keyboard focus stays inside, Escape closes it, the close button works,
background scrolling stops, and focus returns to the opener. On small screens,
scroll to the last option and confirm the footer remains reachable.

| Screen                                                   | How to open                                   | Checks                                                                                           |
| -------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `/tracker`, Timeline                                     | Sliders beside Fuel technologies              | Grouping, contribution basis, column visibility, backdrop dismissal, saved URL settings          |
| `/tracker`, Time of Day                                  | Fuel technology options                       | Grouping, close and reopen, return to Timeline                                                   |
| `/scenarios`, mobile                                     | Open filters beside the view selector         | Plan, scenario, pathway, region and chart selections; sticky header and long lists               |
| `/records`, mobile                                       | Open filters below the sort control           | Region, technology, metric, period and significance; Close and Escape                            |
| `/records/au.nem.vic1.solar.power.interval.high`, mobile | Open filters beside All Records               | Technology, aggregate, region, metric and period; selections navigate while the modal stays open |
| Theme switcher                                           | Currently disabled in `(main)/+layout.svelte` | Shared modal consumer migrated, but no active UI entry point to manually exercise                |

## Single-select checklist

For each control, open it, change an option with the mouse, reopen it, use arrow
keys and Escape, and confirm the selected label and resulting data agree. Check
both desktop and mobile layouts where available. Multi-select controls retain
their existing implementation.

| Screen                                           | Controls using the replaced component                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `/tracker`                                       | Timeline grouping/contribution and Time of Day grouping                                                                  |
| `/`                                              | Records region filter; “Explore the future” scenario and technology grouping                                             |
| `/records`                                       | Region selector in the page heading                                                                                      |
| `/records/au.nem.vic1.solar.power.interval.high` | Technology, aggregate, region, metric and period, desktop and mobile                                                     |
| `/scenarios`                                     | Plan, scenario, pathway, region; technology table grouping; Add Model / Add Scenario / Add Pathway in the scenario table |
| `/studio/renewables`                             | Smoothing and value type                                                                                                 |
| `/studio/facility-plot`                          | Chart type, curve and display prefix                                                                                     |
| `/studio/explorer`                               | Region and fuel technology grouping                                                                                      |
| `/studio/lens-on-ember`                          | Range, interval and table fuel technology grouping                                                                       |
| `/studio/tracker/dashboard`                      | Layout; panel width/height in edit mode; map metric                                                                      |

The shared change also reaches these older components. No active route importing
these explorer roots was found; do not treat them as verified screens:

- `info-graphics/integrated-system-plan/Explorer.svelte` and `Preview.svelte`:
  model, scenario, pathway and technology grouping.
- `info-graphics/scenarios-explorer/Selection.svelte`, `ScenarioSelection.svelte`,
  `Filters-new.svelte`, `Table.svelte` and `TechnologyTable.svelte`: scenario,
  model, pathway, range/interval and grouping controls.

Paths above are relative to `src/lib/components/` for the legacy components.
The homepage preview is active and is listed separately in the checklist.

## Checkbox checklist

`Checkbox.svelte` is now the single Bits UI Checkbox implementation; the former
`CheckboxNew.svelte` and `Checkbox2.svelte` wrappers are removed and their
callers import it directly. Styling matches the Bits UI documentation example:
25px rounded box, dark checked fill, white tick, mixed-state minus, focus outline
and disabled treatment. Labels use unique IDs, remain clickable and inherit
typography from the caller's `class`; checked and indeterminate bindings are retained.

| Screen                  | Controls to check                                                    |
| ----------------------- | -------------------------------------------------------------------- |
| `/tracker`              | Table columns in Fuel technology options, including Show all columns |
| `/scenarios`            | Include Loads above the technology table                             |
| `/studio/renewables`    | Gross demand                                                         |
| `/records-checker`      | Hierarchical filters, particularly partly selected parent nodes      |
| `/studio/design-system` | Form controls: checked, unchecked, mixed and disabled examples       |

The legacy scenario selection component also imports the shared checkbox.
MultiSelect's embedded indicators and other inline native checkboxes remain a
separate follow-up; they do not use these shared checkbox components.

## Segmented switch note

`SwitchWithIcons.svelte` (hand-rolled, the tracker's view switcher and the
Compare regions display chip) now accepts an optional `title` per button so
icon-only buttons carry a native tooltip alongside their `ariaLabel`. It is not
a Bits UI component; a Toggle Group migration remains a candidate below.

## Suggested next migrations

1. `ui/options-menu/OptionsMenu.svelte` and other custom action menus → Bits UI
   Dropdown Menu, for shared keyboard navigation and dismissal.
2. `form-elements/MultiSelect.svelte` → the shared Bits UI Checkbox with Popover
   for dropdowns; preserve modifier-key selection behaviour.
3. Remaining standalone dialogs (facility mobile filters, tracker PNG export,
   Stratify's expanded editor) → the shared Dialog wrapper. Confirmation dialogs
   in Stratify and Tracker Explore are candidates for Bits UI Alert Dialog.

4. `SwitchWithIcons.svelte` → Bits UI Toggle Group, keeping the sliding thumb
   and the per-button icon, `ariaLabel` and `title` options its callers use.

These are follow-up suggestions and are not included in this migration.
